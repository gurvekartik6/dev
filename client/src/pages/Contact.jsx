import { ArrowUpRight, Code2, Mail } from 'lucide-react'
import { useSite } from '../context/SiteContext'

export default function Contact() {
  const { content: d } = useSite()
  const copy = d.home?.sectionCopy?.contact || {}

  return (
    <section className="contact page-contact">
      <div className="shell contact-inner">
        <div>
          <p className="section-kicker">{copy.kicker || 'CONTACT'}</p>
          <h2>{d.contact.title}<br /><em>Start a conversation.</em></h2>
          <p>{d.contact.description}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={`mailto:${d.site.email}`}><Mail size={17} />{d.contact.buttonText || 'Email DevSphere'}</a>
            {d.site.instagram && <a className="btn btn-secondary" href={d.site.instagram} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={15} /></a>}
          </div>
        </div>
        <div className="contact-orb"><div><Code2 size={34} /><span>BUILD<br />LEARN<br />SHIP</span></div></div>
      </div>
    </section>
  )
}
