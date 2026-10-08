import { useEffect, useRef, useState } from "react";

export default function Home() {
  const homeRef = useRef(null);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const home = homeRef.current;
    if (!home) return undefined;
    document.documentElement.classList.add("home-scroll-page");

    const observer = new IntersectionObserver(
      () => {
        const viewportCenter = window.innerHeight / 2;
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        home.querySelectorAll(".home-section").forEach((section, index) => {
          const bounds = section.getBoundingClientRect();
          const visibleHeight = Math.max(
            0,
            Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0)
          );
          if (visibleHeight === 0) return;

          const sectionCenter = (bounds.top + bounds.bottom) / 2;
          const distance = Math.abs(sectionCenter - viewportCenter);
          if (distance < closestDistance) {
            closestIndex = index;
            closestDistance = distance;
          }
        });

        setActiveSection(closestIndex);
      },
      {
        root: null,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    home.querySelectorAll(".home-section").forEach((section) => {
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("home-scroll-page");
    };
  }, []);

  return (
    <section className="home-page" ref={homeRef}>
      <h1>Hey folks! If you're reading this,
        <br/>  
        You're probably interested in what I have to say! 😺</h1>
      <div className="home-sections">
        <section
          className="home-section"
          data-active={activeSection === 0}
          aria-label="About Keith"
        >
          <p>
            I'm Keith! I'm a computer guy through and through, with a lifetime
            of hands-on experience with computer hardware and a formal
            background in programming. I graduated with Distinction (3.9 GPA)
            from Conestoga College's Computer Programming/Analyst 3-year
            program, and I spent 12 months on co-op at Linamar Corporation: 4
            months as an Application Developer and 8 months as a Desktop
            Support Technician.
          </p>
        </section>
        <section
          className="home-section"
          data-active={activeSection === 1}
          aria-label="Technical experience"
        >
          <p>
            On the technical side, I work with C#, .NET MVC, HTML, CSS,
            JavaScript, TypeScript, SQL, and RESTful APIs, and React.js is my
            main tool. I also hold a Front-End Development bootcamp certificate
            from edX in partnership with the University of Toronto (Dec 2024)
            and a Foundational C# certificate from Microsoft and freeCodeCamp
            (Oct 2024). You can see my work at{" "}
            <a href="https://keithsialana.netlify.app/">my website</a>.
          </p>
        </section>
        <section
          className="home-section"
          data-active={activeSection === 2}
          aria-label="Interests"
        >
          <p>
            Outside of tech, I love anime and games of all kinds, especially
            MMORPGs, shooters, and casual games. My all-time favorites are
            Monster Hunter, Destiny 2, TERA Online, Pokémon, and The Legend of
            Zelda. I'm also a huge cat lover, and my Instagram Reels feed is
            basically all cats: cat memes, funny cat videos, and AI cat videos.
            I played competitive basketball from a young age until Grade 10,
            and now I enjoy recreational volleyball, make digital art, and
            learning to rollerblade. I'm always looking to meet people with
            similar tastes, so if any of this sounds like you, hit me up &gt;:)
          </p>
        </section>
      </div>
    </section>
  );
}