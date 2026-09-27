import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import SectionHead from "../components/SectionHead";

function SmartLink({ url, children }) {
  return /^https?:\/\//i.test(url || "") ? (
    <a href={url} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <Link to={url || "#"}>{children}</Link>
  );
}

export default function Projects() {
  const { content: d } = useSite();
  const c = d.home?.sectionCopy?.projects || {};

  const projects = Array.isArray(d.projects) ? d.projects : [];

  return (
    <section className="section projects-section" style={{ paddingTop: 140 }}>
      <SectionHead
        kicker={c.kicker || "PROJECTS"}
        title={c.title || "Our projects"}
        text={c.text}
      />

      <div className="projects">
        {projects.map((p) => (
          <article className="project" key={p.id}>
            <div className="project-image">
              <img src={p.image} alt={p.title} />
              <span>{p.category}</span>
            </div>

            <div className="project-content">
              <h3>{p.title}</h3>

              <p>{p.description}</p>

              <div className="tech">
                {(p.tech || []).map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>

              <SmartLink url={p.link}>
                Open project <ArrowUpRight size={14} />
              </SmartLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}