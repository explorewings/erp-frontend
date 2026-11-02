import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LuFileSpreadsheet, LuUpload, LuX } from 'react-icons/lu'
import readXlsxFile, { readSheetNames } from 'read-excel-file'
import {
  appendClientImportBatch,
  completeClientImport,
  createClientImport,
  failClientImport,
} from '../api.js'

const STEP_CONTENT = [
  {
    title: 'Upload your client data',
    description: 'One CSV or Excel file per import. The first worksheet is used.',
  },
  {
    title: 'Select columns to include',
    description: 'All columns are selected by default. Unselect any columns you do not want to import.',
  },
  {
    title: 'Match columns to client fields',
    description: 'Choose the spreadsheet columns for client name and email or phone. Other selected columns are saved as additional client data.',
  },
  {
    title: 'Preview your import',
    description: 'Review your selected client data and name this import before importing.',
  },
]
const MAX_ROWS = 500
const ROW_LIMIT_ERROR = 'This file exceeds the 500-row import limit.'
const BATCH_SIZE = 100
const CLIENT_FIELDS = [
  { key: 'name', label: 'Client name', aliases: ['name', 'clientname', 'fullname', 'customername'] },
  { key: 'email', label: 'Email', aliases: ['email', 'emailaddress', 'clientemail'] },
  { key: 'phoneNumber', label: 'Phone', aliases: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contactnumber'] },
]

const EMPTY_MAPPINGS = {
  name: '',
  email: '',
  phoneNumber: '',
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function inferMappings(headers) {
  const mappings = { ...EMPTY_MAPPINGS }
  for (const field of CLIENT_FIELDS) {
    const header = headers.find(({ label }) => field.aliases.includes(normalizeHeader(label)))
    if (header) mappings[field.key] = String(header.index)
  }
  return mappings
}

function hasRequiredFieldMappings(selectedColumns, mappings) {
  const selected = new Set(selectedColumns.map(String))
  const hasName = mappings.name && selected.has(mappings.name)
  const hasContact = ['email', 'phoneNumber'].some(
    (field) => mappings[field] && selected.has(mappings[field]),
  )
  return Boolean(hasName && hasContact)
}

function makeUniqueHeaders(values) {
  const counts = new Map()
  return values.map((value, index) => {
    const base = String(value ?? '').trim() || `Column ${index + 1}`
    const count = (counts.get(base.toLowerCase()) || 0) + 1
    counts.set(base.toLowerCase(), count)
    return { index, label: count === 1 ? base : `${base} (${count})` }
  })
}

function isBlankRow(row) {
  return row.every((cell) => String(cell ?? '').trim() === '')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const source = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('The CSV file contains an unclosed quoted value.')
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function cellToText(value) {
  if (value instanceof Date) return value.toLocaleDateString()
  return String(value ?? '').trim()
}

function parseWorkbook(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const readRows = extension === 'csv'
    ? file.text().then(parseCsv)
    : Promise.all([readSheetNames(file), readXlsxFile(file, { sheet: 1 })]).then(
      ([sheetNames, matrix]) => ({ sheetNames, matrix }),
    )

  return Promise.resolve(readRows).then((result) => {
    const sheetNames = extension === 'csv' ? ['CSV data'] : result.sheetNames
    const matrix = (extension === 'csv' ? result : result.matrix)
      .map((row) => row.map(cellToText))
    const firstSheetName = sheetNames[0]
    if (!firstSheetName) throw new Error('The selected file does not contain a worksheet.')
    if (matrix.length < 2) throw new Error('Include a header row and at least one client row.')

    const headers = makeUniqueHeaders(matrix[0])
    if (!headers.some(({ label }) => !/^Column \d+$/.test(label))) {
      throw new Error('The first row must contain column headers.')
    }

    const rows = matrix
      .slice(1)
      .filter((row) => !isBlankRow(row))
      .map((row) => headers.map(({ index }) => String(row[index] ?? '').trim()))
    if (!rows.length) throw new Error('No client rows were found below the headers.')
    if (rows.length > MAX_ROWS) {
      throw new Error(ROW_LIMIT_ERROR)
    }

    return {
      headers,
      rows,
      mappings: inferMappings(headers),
      sheetName: firstSheetName,
      hasMultipleSheets: sheetNames.length > 1,
    }
  })
}

function buildClientRows(headers, rows, selectedColumns, mappings) {
  const selected = headers.filter(({ index }) => selectedColumns.includes(index))
  const mappedColumns = new Set(Object.values(mappings).filter((index) => index !== ''))
  const customColumns = selected.filter(({ index }) => !mappedColumns.has(String(index)))
  const errors = []

  if (!mappings.name || !selectedColumns.includes(Number(mappings.name))) {
    errors.push('Choose a selected column for Client name.')
  }
  const hasContactMapping = ['email', 'phoneNumber'].some(
    (field) => mappings[field] && selectedColumns.includes(Number(mappings[field])),
  )
  if (!hasContactMapping) errors.push('Choose a selected column for Email or Phone.')
  if (customColumns.length > 50) errors.push('Select no more than 50 additional-data columns.')

  const mappedValues = Object.values(mappings).filter((index) => index !== '')
  if (new Set(mappedValues).size !== mappedValues.length) {
    errors.push('Use a different spreadsheet column for each client field.')
  }

  const clients = rows.map((row, rowIndex) => {
    const customFields = {}
    const record = {
      name: mappings.name ? String(row[Number(mappings.name)] ?? '').trim() : '',
      email: mappings.email ? String(row[Number(mappings.email)] ?? '').trim() || null : null,
      phoneNumber: mappings.phoneNumber
        ? String(row[Number(mappings.phoneNumber)] ?? '').trim() || null
        : null,
      customFields,
    }

    for (const column of customColumns) {
      const value = String(row[column.index] ?? '').trim()
      if (value) customFields[column.label] = value
    }

    if (!record.name) errors.push(`Row ${rowIndex + 2}: client name is required.`)
    if (!record.email && !record.phoneNumber) {
      errors.push(`Row ${rowIndex + 2}: provide an email address or phone number.`)
    }
    if (record.name.length > 200) errors.push(`Row ${rowIndex + 2}: name exceeds 200 characters.`)
    if (record.email && (record.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))) {
      errors.push(`Row ${rowIndex + 2}: email is invalid or exceeds 320 characters.`)
    }
    if (record.phoneNumber && record.phoneNumber.length > 40) {
      errors.push(`Row ${rowIndex + 2}: phone number exceeds 40 characters.`)
    }
    if (Object.entries(customFields).some(([key, value]) => key.length > 100 || value.length > 1000)) {
      errors.push(`Row ${rowIndex + 2}: additional-data names must be at most 100 characters and values at most 1000 characters.`)
    }
    return record
  })

  return { clients, errors }
}

export default function ClientImportModal({ open, token, onClose, onImported }) {
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mappings, setMappings] = useState(EMPTY_MAPPINGS)
  const [selectedColumns, setSelectedColumns] = useState([])
  const [sheetNotice, setSheetNotice] = useState('')
  const [importName, setImportName] = useState('')
  const [error, setError] = useState('')
  const [isReading, setIsReading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importRecordCreated, setImportRecordCreated] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)

  const { clients: clientRows, errors: validationErrors } = useMemo(
    () => buildClientRows(headers, rows, selectedColumns, mappings),
    [headers, rows, selectedColumns, mappings],
  )
  const previewColumns = useMemo(() => {
    const selected = headers.filter(({ index }) => selectedColumns.includes(index))
    const fields = CLIENT_FIELDS.flatMap((field) => {
      const sourceIndex = mappings[field.key]
      const column = selected.find(({ index }) => String(index) === sourceIndex)
      return column ? [{ key: field.key, label: column.label }] : []
    })
    const mappedColumns = new Set(Object.values(mappings).filter((index) => index !== ''))
    return fields.concat(
      selected
        .filter(({ index }) => !mappedColumns.has(String(index)))
        .map((column) => ({ key: column.label, label: column.label })),
    )
  }, [headers, selectedColumns, mappings])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isImporting) onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isImporting, onClose])

  useEffect(() => {
    if (!open) return
    setStep(0)
    setFileName('')
    setHeaders([])
    setRows([])
    setMappings({ ...EMPTY_MAPPINGS })
    setSelectedColumns([])
    setSheetNotice('')
    setImportName('')
    setError('')
    setIsReading(false)
    setIsImporting(false)
    setImportRecordCreated(false)
    setProgress(0)
  }, [open])

  if (!open) return null

  const handleFile = async (file) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx'].includes(extension)) {
      setError('Choose a CSV or Excel file (.csv or .xlsx).')
      return
    }
    setIsReading(true)
    setImportName('')
    setError('')
    try {
      const parsed = await parseWorkbook(file)
      setFileName(file.name)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setMappings(parsed.mappings)
      setSelectedColumns(parsed.headers.map(({ index }) => index))
      setSheetNotice(
        parsed.hasMultipleSheets
          ? `Using the first worksheet, "${parsed.sheetName}".`
          : `Worksheet: ${parsed.sheetName}`,
      )
    } catch (parseError) {
      setFileName('')
      setHeaders([])
      setRows([])
      setMappings({ ...EMPTY_MAPPINGS })
      setSelectedColumns([])
      setError(parseError?.message || 'Unable to read this file.')
    } finally {
      setIsReading(false)
    }
  }

  const toggleColumn = (index) => {
    setSelectedColumns((current) => {
      if (!current.includes(index)) return [...current, index]
      setMappings((currentMappings) => Object.fromEntries(
        Object.entries(currentMappings).map(([field, sourceIndex]) => [
          field,
          sourceIndex === String(index) ? '' : sourceIndex,
        ]),
      ))
      return current.filter((value) => value !== index)
    })
  }

  const goToMatch = () => {
    setError('')
    setStep(2)
  }

  const startImport = async () => {
    const name = importName.trim()
    if (!name || name.length > 120) {
      setError('Enter an import name of 1 to 120 characters.')
      return
    }
    if (validationErrors.length) {
      setError(validationErrors[0])
      return
    }

    setError('')
    setIsImporting(true)
    setProgress(0)
    let importId = null
    let importedRows = 0
    try {
      const created = await createClientImport(token, { name, totalRows: clientRows.length })
      importId = created.id
      setImportRecordCreated(true)
      for (let offset = 0; offset < clientRows.length; offset += BATCH_SIZE) {
        const batch = clientRows.slice(offset, offset + BATCH_SIZE)
        const result = await appendClientImportBatch(token, importId, batch)
        importedRows = result.importedRows
        setProgress(Math.round((importedRows / clientRows.length) * 100))
      }
      await completeClientImport(token, importId)
      onImported?.({ name, importedRows })
      onClose?.()
    } catch (importError) {
      let failureMessage = importError?.message || 'Unable to complete client import.'
      let savedRows = importedRows
      if (importId) {
        try {
          const failedImport = await failClientImport(token, importId)
          savedRows = failedImport.importedRows
        } catch (failureError) {
          failureMessage = `${failureMessage} The import could not be marked as failed: ${failureError?.message || 'Unknown error.'}`
        }
      }
      setError(
        savedRows
          ? `${failureMessage} ${savedRows} of ${clientRows.length} rows were saved.`
          : failureMessage,
      )
      setProgress(Math.round((savedRows / clientRows.length) * 100))
    } finally {
      setIsImporting(false)
    }
  }

  const closeModal = () => {
    if (!isImporting) onClose?.()
  }

  const fieldClass =
    'h-10 w-full rounded-xs border bg-surface px-3 text-sm text-[var(--ew-ink)] outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60'
  const fieldStyle = { borderColor: 'var(--ew-field-line)' }

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center overflow-y-auto bg-ink/50 p-2 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal()
      }}
    >
      <section
        className="flex h-[min(30rem,calc(100dvh-1rem))] w-full max-w-2xl flex-col overflow-hidden rounded-control border shadow-2xl"
        style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-import-step-title"
      >
        <header className="shrink-0">
          <div className="flex items-start justify-between gap-3 px-4 py-2.5 sm:px-5">
            <div className="min-w-0">
              <h2 id="client-import-step-title" className="text-sm font-semibold text-[var(--ew-ink)]">
                {STEP_CONTENT[step].title}
              </h2>
              <p className="mt-1 text-xs text-[var(--ew-muted)]">
                {STEP_CONTENT[step].description}
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              disabled={isImporting}
              aria-label="Close import dialog"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border text-[var(--ew-muted)] hover:bg-ground hover:text-[var(--ew-ink)] disabled:opacity-50"
              style={{ borderColor: 'var(--ew-line)' }}
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {step === 0 && (
            <div className="flex h-full min-h-[18rem] flex-col">
              <div className="mb-4">
                <p
                  className={`mt-2 text-sm font-medium ${error === ROW_LIMIT_ERROR ? 'text-danger-strong' : 'text-[var(--ew-muted)]'}`}
                  role={error === ROW_LIMIT_ERROR ? 'alert' : undefined}
                >
                  {error === ROW_LIMIT_ERROR ? ROW_LIMIT_ERROR : 'Maximum 500 client rows per import.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReading}
                className="group flex min-h-0 flex-1 flex-col items-center justify-center rounded-control border-2 border-dashed px-5 py-10 text-center transition-colors hover:border-[#2d82f6] hover:bg-ground/40 disabled:opacity-60"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                {fileName ? (
                  <>
                    <LuFileSpreadsheet className="h-10 w-10 text-[#2d82f6]" />
                    <span className="mt-4 max-w-full truncate text-sm font-semibold text-[var(--ew-ink)]">{fileName}</span>
                    <span className="mt-1 text-xs text-[var(--ew-muted)]">
                      {rows.length} data rows · {headers.length} columns
                    </span>
                    {sheetNotice && <span className="mt-2 text-xs text-[var(--ew-muted)]">{sheetNotice}</span>}
                    <span className="mt-4 text-sm font-medium text-[#2d82f6]">Choose a different file</span>
                  </>
                ) : (
                  <>
                    <LuUpload className="h-10 w-10 text-[var(--ew-muted)] transition-colors group-hover:text-[#2d82f6]" />
                    <span className="mt-4 text-sm font-semibold text-[var(--ew-ink)]">
                      {isReading ? 'Reading file...' : 'Choose a CSV or Excel file'}
                    </span>
                    <span className="mt-1 text-xs text-[var(--ew-muted)]">.csv, .xlsx</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <span className="text-xs font-medium text-[var(--ew-muted)]">
                  {selectedColumns.length} of {headers.length} selected
                </span>
              </div>
              <div className="divide-y overflow-hidden rounded-control border" style={{ borderColor: 'var(--ew-line)' }}>
                {headers.map((header) => {
                  const checked = selectedColumns.includes(header.index)
                  return (
                    <label
                      key={header.index}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-[var(--ew-ink)] hover:bg-ground/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumn(header.index)}
                        className="h-4 w-4 accent-[#2d82f6]"
                      />
                      <span className="min-w-0 flex-1 truncate">{header.label}</span>
                      <span className="text-xs text-[var(--ew-muted)]">
                        {rows.find((row) => String(row[header.index] ?? '').trim())?.[header.index] || '—'}
                      </span>
                    </label>
                  )
                })}
              </div>
              {selectedColumns.length === 0 && (
                <p className="text-sm text-[var(--ew-accent-strong)]">Select at least one column to continue.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {CLIENT_FIELDS.map((field) => {
                const usedByAnotherField = new Set(
                  Object.entries(mappings)
                    .filter(([mappedField, sourceIndex]) =>
                      mappedField !== field.key && sourceIndex !== '',
                    )
                    .map(([, sourceIndex]) => sourceIndex),
                )
                const selectedHeaders = headers.filter(({ index }) => selectedColumns.includes(index))
                const selectedSource = mappings[field.key]
                const sample = selectedSource
                  ? rows.find((row) => String(row[Number(selectedSource)] ?? '').trim())?.[Number(selectedSource)]
                  : ''

                return (
                  <label
                    key={field.key}
                    className="grid gap-2 rounded-control border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] sm:items-center"
                    style={{ borderColor: 'var(--ew-line)' }}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--ew-ink)]">{field.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--ew-muted)]">
                        {sample ? `Example: ${sample}` : field.key === 'name' ? 'Required' : 'Optional; map Email or Phone'}
                      </span>
                    </span>
                    <select
                      value={selectedSource}
                      onChange={(event) =>
                        setMappings((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      className={fieldClass}
                      style={fieldStyle}
                      aria-label={`Choose a column for ${field.label}`}
                    >
                      <option value="">Do not map</option>
                      {selectedHeaders.map((header) => (
                        <option
                          key={header.index}
                          value={String(header.index)}
                          disabled={usedByAnotherField.has(String(header.index))}
                        >
                          {header.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              })}
              <p className="text-xs text-[var(--ew-muted)]">
                Client name and either Email or Phone are required. Selected columns not mapped above are saved as additional data.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="flex h-full min-h-[18rem] flex-col">
              {validationErrors.length > 0 && (
                <div
                  className="mb-3 rounded-control border px-4 py-3 text-sm"
                  style={{
                    borderColor: 'rgba(194, 65, 12, 0.28)',
                    background: 'rgba(194, 65, 12, 0.06)',
                    color: 'var(--ew-accent-strong)',
                  }}
                  role="alert"
                >
                  <p className="font-medium">Fix these issues before importing:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {validationErrors.slice(0, 5).map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
                    {validationErrors.length > 5 && <li>And {validationErrors.length - 5} more issues.</li>}
                  </ul>
                </div>
              )}
              <div className="mb-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block text-xs font-medium text-[var(--ew-muted)]">
                  Import name <span className="text-danger-strong">· Required</span>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={importName}
                    onChange={(event) => setImportName(event.target.value)}
                    disabled={isImporting}
                    className={`${fieldClass} mt-1.5`}
                    style={fieldStyle}
                    placeholder="e.g. November client list"
                  />
                </label>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-control border" style={{ borderColor: 'var(--ew-line)' }}>
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-ground">
                    <tr>
                      {previewColumns.map((column) => (
                        <th key={column.key} className="whitespace-nowrap border-b px-4 py-3 text-xs font-semibold text-[var(--ew-muted)]" style={{ borderColor: 'var(--ew-line)' }}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientRows.slice(0, 5).map((client, rowIndex) => (
                      <tr key={rowIndex} className="border-b last:border-b-0" style={{ borderColor: 'var(--ew-line)' }}>
                        {previewColumns.map((column) => (
                          <td key={column.key} className="max-w-64 whitespace-nowrap px-4 py-3 text-[var(--ew-ink)]">
                            {column.key === 'name' || column.key === 'email' || column.key === 'phoneNumber'
                              ? client[column.key] || '—'
                              : client.customFields[column.key] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-[var(--ew-muted)]">
                Client records will be sent in batches of up to {BATCH_SIZE}. A 500-row import uses at most 5 batches.
              </p>
            </div>
          )}

          {error && !(step === 0 && error === ROW_LIMIT_ERROR) && (
            <div
              className="mt-4 rounded-control border px-4 py-3 text-sm"
              style={{
                borderColor: 'rgba(194, 65, 12, 0.28)',
                background: 'rgba(194, 65, 12, 0.06)',
                color: 'var(--ew-accent-strong)',
              }}
              role="alert"
            >
              {error}
            </div>
          )}
        </main>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 sm:px-5" style={{ borderColor: 'var(--ew-line)' }}>
          {isImporting ? (
            <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-md" role="status" aria-live="polite">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ground">
                <div
                  className="h-full rounded-full bg-[#cc785c] transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-[var(--ew-muted)]">{progress}%</span>
            </div>
          ) : <span aria-hidden="true" />}
          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep((current) => current - 1)
                }}
                disabled={isImporting || importRecordCreated}
                className="h-10 rounded-xs border px-4 text-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground disabled:opacity-50"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Back
              </button>
            )}
            {step === 0 && (
              <button
                type="button"
                onClick={closeModal}
                disabled={isImporting}
                className="h-10 rounded-xs border px-4 text-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground disabled:opacity-50"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Cancel
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 0 && (!headers.length || isReading)) return
                  if (step === 1 && !selectedColumns.length) {
                    setError('Select at least one column to continue.')
                    return
                  }
                  setError('')
                  if (step === 1) goToMatch()
                  else {
                    setStep((current) => current + 1)
                  }
                }}
                disabled={
                  (step === 0 && (!headers.length || isReading))
                  || (step === 2 && !hasRequiredFieldMappings(selectedColumns, mappings))
                  || isImporting
                }
                className="h-10 rounded-xs bg-[#cc785c] px-5 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            ) : importRecordCreated && !isImporting ? (
              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-xs border px-5 text-sm font-medium text-[var(--ew-ink)] transition-colors hover:bg-ground"
                style={{ borderColor: 'var(--ew-line)' }}
              >
                Close
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startImport()}
                disabled={isImporting || !importName.trim() || validationErrors.length > 0}
                className="h-10 rounded-xs bg-[#cc785c] px-5 text-sm font-medium text-white transition-colors hover:bg-[#b36a4e] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
