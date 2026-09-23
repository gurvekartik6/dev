import { Award, Sparkles } from 'lucide-react'
import { useSite } from '../context/SiteContext'
import SectionHead from '../components/SectionHead'

export default function Media() {
  const { content: d } = useSite()
  const copy = d.home?.sectionCopy?.media || {}

  return (
    <section className="section page-hero media-section">
      <div className="shell">
        <SectionHead kicker={copy.kicker || 'MEDIA + ACHIEVEMENTS'} title={copy.title || 'The work, the moments, the milestones.'} text={copy.text || 'A visual record of DevSphere activities and the progress made by the community.'} />
        <div className="media-grid">
          {d.media.map((item) => (
            <article key={item.id}>
              <img src={item.image} alt={item.title} />
              <div><small>{item.type} · {item.year}</small><h3>{item.title}</h3></div>
            </article>
          ))}
        </div>
        <div className="achievement-heading"><Award size={18} /><span>ACHIEVEMENTS</span></div>
        <div className="achievements">
          {d.achievements.map((item) => (
            <div key={item.id}><Sparkles /><h3>{item.title}</h3><p>{item.detail}</p></div>
          ))}
        </div>
      </div>
    </section>
  )
}
