import { PACKAGE_CATEGORIES } from '../category-options.js'

export default function PackageCategoryTabs({
  value,
  onChange,
  disabled = false,
  labelledBy,
}) {
  const categories =
    value && !PACKAGE_CATEGORIES.includes(value)
      ? [...PACKAGE_CATEGORIES, value]
      : PACKAGE_CATEGORIES

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="inline-flex max-w-full flex-wrap rounded-lg border p-1"
      style={{ borderColor: 'var(--ew-line)', background: 'var(--ew-surface)' }}
    >
      {categories.map((category) => {
        const isActive = value === category
        return (
          <button
            key={category}
            type="button"
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(category)}
            className={`px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive ? 'rounded-xs' : 'rounded-lg'
            }`}
            style={
              isActive
                ? { background: '#cc785c', color: '#fff' }
                : { color: 'var(--ew-muted)' }
            }
          >
            {category}
            {!PACKAGE_CATEGORIES.includes(category) && ' (current)'}
          </button>
        )
      })}
    </div>
  )
}
