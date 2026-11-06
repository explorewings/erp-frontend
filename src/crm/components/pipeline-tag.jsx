/** Small tag showing a pipeline's name, truncated at 10rem with the full name on hover. */
export default function PipelineTag({ name, className = '' }) {
  return (
    <span
      title={name}
      className={`min-w-0 max-w-[10rem] truncate rounded-[2px] bg-[#cc785c]/10 px-2 py-0.5 text-[11px] font-medium text-[#b76c4f] ${className}`}
    >
      {name}
    </span>
  )
}
