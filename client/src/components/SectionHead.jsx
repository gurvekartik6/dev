export default function SectionHead({ kicker, title, text, action }) {
  return (
    <div className="section-heading-row">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {text && <p className="section-head-copy">{text}</p>}
      {action}
    </div>
  )
}
