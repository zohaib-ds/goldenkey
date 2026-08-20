import { useState, useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import "./App.css";

const propertyMenu = {
  buy: [
    {
      label: "Apartments for sale in Dubai",
      type: "Apartment",
    },
    {
      label: "Villas for sale in Dubai",
      type: "Villa",
    },
    {
      label: "Townhouses for sale in Dubai",
      type: "Townhouse",
    },
    {
      label: "Penthouses for sale in Dubai",
      type: "Penthouse",
    },
  ],

  rent: [
    {
      label: "Apartments for rent in Dubai",
      type: "Apartment",
    },
    {
      label: "Villas for rent in Dubai",
      type: "Villa",
    },
    {
      label: "Townhouses for rent in Dubai",
      type: "Townhouse",
    },
    {
      label: "Penthouses for rent in Dubai",
      type: "Penthouse",
    },
  ],
};

const servicesMenu = [
  {
    label: "Property Management",
    path: "/services/property-management",
  },
  {
    label: "Development Sales & Consultancy",
    path: "/services/development-sales-and-consultancy",
  },
  {
    label: "Property Valuation",
    path: "/services/property-valuation",
  },
  {
    label: "Holiday Home Services",
    path: "/services/holiday-home-services",
  },
  {
    label: "Citizenship Program",
    path: "/services/citizenship-program",
  },
];

const nav = [
  ["Insights", "/insights"],
  ["Guides", "/guides"],
  ["Projects", "/projects"],
  ["About", "/about"],
];
const IMG = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=88",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=88",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=88",
  "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1400&q=88",
];

const STORAGE_KEY = "betterhomes.properties.v1";


// Module-level cache so the seed fetch (properties.json) only ever
// runs once, even if multiple components call loadProperties() at
// nearly the same time on first load. Without this, a manual "Add
// listing" done in the admin panel while the seed fetch is still in
// flight could get silently overwritten once that fetch resolved.
let seedLoadPromise = null;


const AREA_GUIDES_STORAGE_KEY = "betterhomes.area-guides.v1";

let areaGuideSeedPromise = null;

function readStoredAreaGuides() {
  const stored = localStorage.getItem(
    AREA_GUIDES_STORAGE_KEY
  );

  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed.guides)) {
      return parsed.guides;
    }

    return null;
  } catch (error) {
    console.error(
      "Error parsing area guides:",
      error
    );

    return null;
  }
}

async function loadAreaGuides() {
  try {
    const stored = readStoredAreaGuides();

    if (stored) {
      return stored;
    }

    if (!areaGuideSeedPromise) {
      areaGuideSeedPromise = fetch(
        "/data/area-guides.json"
      )
        .then(async (response) => {
          if (!response.ok) {
            return [];
          }

          const data = await response.json();

          const guides = Array.isArray(data)
            ? data
            : data.guides || [];

          const latest = readStoredAreaGuides();

          if (latest) {
            return latest;
          }

          localStorage.setItem(
            AREA_GUIDES_STORAGE_KEY,
            JSON.stringify(guides)
          );

          return guides;
        })
        .catch((error) => {
          console.error(
            "Could not load area guides:",
            error
          );

          return [];
        });
    }

    return await areaGuideSeedPromise;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveAreaGuides(next) {
  localStorage.setItem(
    AREA_GUIDES_STORAGE_KEY,
    JSON.stringify(next)
  );

  window.dispatchEvent(
    new Event("area-guides-updated")
  );

  return next;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readStoredProperties() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);

    // Support both old array data and { properties: [] } data
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed.properties)) {
      return parsed.properties;
    }

    return null;
  } catch (error) {
    console.error("❌ Error parsing stored properties:", error);
    return null;
  }
}

async function loadProperties() {
  try {
    const stored = readStoredProperties();

    console.log("📦 Stored listings:", stored);

    if (stored) {
      console.log("✅ Loaded listings:", stored);
      return stored;
    }

    // No local data: load seed file exactly once, no matter how many
    // callers hit this branch concurrently.
    if (!seedLoadPromise) {
      seedLoadPromise = (async () => {
        const response = await fetch("/data/properties.json");

        if (!response.ok) {
          throw new Error("Could not load properties.json");
        }

        const data = await response.json();

        const properties = Array.isArray(data)
          ? data
          : data.properties || [];

        // Re-check storage right before writing: if something else
        // (e.g. a manual "Add listing" submit) already wrote real
        // data while this fetch was in flight, don't clobber it with
        // the seed — just use whatever is already there.
        const latest = readStoredProperties();

        if (latest) {
          console.log(
            "⚠️ Storage was written while seed was loading, keeping existing data:",
            latest
          );
          return latest;
        }

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(properties)
        );

        console.log(
          "🌱 Loaded seed properties:",
          properties
        );

        return properties;
      })();
    }

    return await seedLoadPromise;

  } catch (error) {
    console.error(
      "❌ Error loading properties:",
      error
    );

    return [];
  }
}

function AnimatedNumber({ value }) {
  const nodeRef = useRef(null);
  const isInView = useInView(nodeRef, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView) return;

    // Parse string into target number, prefix, and suffix
    const match = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!match) {
      if (nodeRef.current) nodeRef.current.textContent = value;
      return;
    }

    const prefix = match[1] || "";
    const rawNumStr = match[2];
    const suffix = match[3] || "";
    const isFloat = rawNumStr.includes(".");
    const targetNum = parseFloat(rawNumStr.replace(/,/g, ""));

    const controls = animate(0, targetNum, {
      duration: 2.2,
      ease: [0.16, 1, 0.3, 1], // Custom smooth ease-out
      onUpdate(latest) {
        if (!nodeRef.current) return;
        
        let formatted = isFloat ? latest.toFixed(1) : Math.floor(latest).toLocaleString();
        nodeRef.current.textContent = `${prefix}${formatted}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [isInView, value]);

  return <span ref={nodeRef}>0</span>;
}

function Diamonds() {
  const stats = [
    ["250k+", "transactions"],
    ["300+", "specialists"],
    ["12", "minutes between transactions"],
    ["2,500+", "positive reviews"],
    ["1.7m", "client database"],
  ];

  return (
    <section className="stats section">
      <div className="wrap">
        <p className="kicker centered">betterhomes in numbers</p>
        <h2 className="serif centered">Experience you can see in the numbers</h2>

        <div className="diamonds">
          {stats.map(([value, label], idx) => (
            <motion.div
              className="diamond"
              key={label}
              initial={{ opacity: 0, y: 35, rotate: 45 }}
              whileInView={{ opacity: 1, y: 0, rotate: 45 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
            >
              <div className="diamond-inner">
                <strong>
                  <AnimatedNumber value={value} />
                </strong>
                <span>{label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function money(v, purpose) {
  const value = Number(v) || 0;
  return purpose === "rent" ? `AED ${value.toLocaleString()} / month` : `AED ${value.toLocaleString()}`;
}
function EnquiryForm({ compact = false, property = null }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyType: "",
    budget: "",
    preferredSize: "",
    nationality: "",
    message: "",
  });

  const update = (patch) => {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  };

  async function submitForm(e) {
    e.preventDefault();

    if (sending) return;

    setSending(true);
    setError("");

    try {
const response = await fetch("/api/pixxi/lead", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    ...form,
    propertyReference:
      property?.reference ||
      property?.propertyReference ||
      property?.referenceNumber ||
      "",
  }),
});

const raw = await response.text();

let data = {};

try {
  data = raw ? JSON.parse(raw) : {};
} catch {
  data = {
    success: false,
    error: raw || "Invalid server response",
  };
}

if (!response.ok || !data.success) {
  throw new Error(
    data.error ||
      `Lead submission failed (${response.status})`
  );
}

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "We could not submit your enquiry."
        );
      }

      setSent(true);

      setForm({
        name: "",
        email: "",
        phone: "",
        propertyType: "",
        budget: "",
        preferredSize: "",
        nationality: "",
        message: "",
      });
    } catch (err) {
      console.error("Enquiry submission failed:", err);

      setError(
        err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="enquiry-success">
        <div className="enquiry-success-icon">
          ✓
        </div>

        <h3>
          Thank you
        </h3>

        <p>
          Your enquiry has been sent successfully.
          A member of the Golden Key team will
          contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      className={
        compact
          ? "enquiry-form compact"
          : "enquiry-form"
      }
      onSubmit={submitForm}
    >

      <div className="enquiry-form-row">

        <div>
          <label>
            First Name
          </label>

          <input
            required
            value={form.name}
            onChange={(e) =>
              update({
                name: e.target.value,
              })
            }
            placeholder="First Name"
          />
        </div>

        <div>
          <label>
            Email Address
          </label>

          <input
            required
            type="email"
            value={form.email}
            onChange={(e) =>
              update({
                email: e.target.value,
              })
            }
            placeholder="Enter Your Email"
          />
        </div>

      </div>

      <div>
        <label>
          Phone Number
        </label>

        <input
          required
          value={form.phone}
          onChange={(e) =>
            update({
              phone: e.target.value,
            })
          }
          placeholder="Phone Number"
        />
      </div>

      <div>
        <label>
          I am interested in
        </label>

        <select
          value={form.propertyType}
          onChange={(e) =>
            update({
              propertyType: e.target.value,
            })
          }
        >
          <option value="">
            Select an option
          </option>

          <option value="Buying a property">
            Buying a property
          </option>

          <option value="Renting a property">
            Renting a property
          </option>

          <option value="Selling a property">
            Selling a property
          </option>

          <option value="Property management">
            Property management
          </option>

          <option value="Property valuation">
            Property valuation
          </option>

          <option value="Development consultancy">
            Development consultancy
          </option>

          <option value="General enquiry">
            General enquiry
          </option>
        </select>
      </div>

      <div>
        <label>
          Budget
        </label>

        <input
          value={form.budget}
          onChange={(e) =>
            update({
              budget: e.target.value,
            })
          }
          placeholder="Your budget"
        />
      </div>

      {!compact && (
        <div>
          <label>
            Preferred Size
          </label>

          <input
            value={form.preferredSize}
            onChange={(e) =>
              update({
                preferredSize:
                  e.target.value,
              })
            }
            placeholder="e.g. 2 bedroom / 1,500 sq ft"
          />
        </div>
      )}

      {!compact && (
        <div>
          <label>
            Nationality
          </label>

          <input
            value={form.nationality}
            onChange={(e) =>
              update({
                nationality:
                  e.target.value,
              })
            }
            placeholder="Nationality"
          />
        </div>
      )}

      <div>
        <label>
          Message
        </label>

        <textarea
          rows={compact ? 4 : 6}
          value={form.message}
          onChange={(e) =>
            update({
              message: e.target.value,
            })
          }
          placeholder="Tell us how we can help"
        />
      </div>

      {error && (
        <p
          style={{
            color: "#c94b4b",
            fontSize: "13px",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        className="enquiry-submit"
        disabled={sending}
      >
        {sending
          ? "Sending..."
          : compact
          ? "Book Consultation"
          : "Send Enquiry"}
      </button>

    </form>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  return (
    <>
      <header className="header">
        <div className="wrap header-inner">

          <a className="logo" href="/">
            better<span>homes</span>
          </a>

          <nav className={open ? "nav nav-open" : "nav"}>
            {/* BUY */}
            <div className="nav-dropdown">
              <a href="/buy" className="nav-main-link" onClick={() => setOpen(false)}>Buy</a>
              <div className="property-menu">
                {propertyMenu.buy.map((item) => (
                  <a key={item.type} href={`/buy?type=${encodeURIComponent(item.type)}`}>{item.label}</a>
                ))}
              </div>
            </div>

            {/* RENT */}
            <div className="nav-dropdown">
              <a href="/rent" className="nav-main-link" onClick={() => setOpen(false)}>Rent</a>
              <div className="property-menu">
                {propertyMenu.rent.map((item) => (
                  <a key={item.type} href={`/rent?type=${encodeURIComponent(item.type)}`}>{item.label}</a>
                ))}
              </div>
            </div>

            {/* SERVICES */}
            <div className="nav-dropdown">
              <a href="/services" className="nav-main-link" onClick={() => setOpen(false)}>Services</a>
              <div className="property-menu services-menu">
                {servicesMenu.map((item) => (
                  <a key={item.path} href={item.path}>{item.label}</a>
                ))}
              </div>
            </div>

            {/* OTHER NAV */}
            {nav.map(([label, href]) => (
              <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>
            ))}
          </nav>

          <button className="enquire" type="button" onClick={() => setEnquiryOpen(true)}>
            Enquire now
          </button>

          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
            <i /><i /><i />
          </button>

        </div>
      </header>

      {enquiryOpen && (
        <div
          className="enquiry-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEnquiryOpen(false);
          }}
        >
          <div className="enquiry-modal">
            <button
              className="enquiry-close"
              type="button"
              onClick={() => setEnquiryOpen(false)}
              aria-label="Close enquiry form"
            >
              ×
            </button>

            <div className="enquiry-modal-content">
              <p className="enquiry-modal-label">CONTACT US</p>
              <h2>Get In Touch With Us</h2>
              <p className="enquiry-modal-description">
                Experience a complimentary consultation with our expert
                Golden Key real estate advisors.
              </p>
              <EnquiryForm compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Hero() {
  const [purpose,setPurpose]=useState("buy");
  return <section className="hero"><div className="hero-bg"/><div className="hero-shade"/><div className="wrap hero-content">
    <p className="kicker light">Dubai real estate</p><h1>Homes that move you</h1>
    <div className="search"><div className="search-location"><span>⌖</span><input placeholder="Location, community or building"/></div>
      <select value={purpose} onChange={e=>setPurpose(e.target.value)}><option value="buy">Buy</option><option value="rent">Rent</option></select>
      <button onClick={()=>location.href=`/${purpose}`}>Search</button>
    </div>
  </div></section>;
}

function useProperties() {
  const [properties, setProperties] = useState([]);

  const refreshProperties = async () => {
    const data = await loadProperties();

    console.log(
      "🔄 Properties loaded into page:",
      data
    );

    setProperties(data);
  };

  useEffect(() => {
    refreshProperties();

    const handleUpdate = () => {
      refreshProperties();
    };

    window.addEventListener(
      "properties-updated",
      handleUpdate
    );

    window.addEventListener(
      "storage",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "properties-updated",
        handleUpdate
      );

      window.removeEventListener(
        "storage",
        handleUpdate
      );
    };
  }, []);

  return properties;
}
function ListingStrip() {
  const properties = useProperties().filter(p=>p.status==="published").slice(0,4);
  return <section className="section offplan"><div className="wrap"><div className="row-head"><div><p className="kicker">Featured properties</p><h2 className="serif">Find your next move</h2></div><a href="/buy" className="underlink">View all →</a></div>
    {properties.length===0?<p className="empty-copy">No published listings yet.</p>:<div className="cards">{properties.map(x=><PropertyCard key={x.id} x={x}/>)}</div>}
  </div></section>;
}

function PropertyCard({ x }) {
  const image =
    x.images?.[0] ||
    x.image ||
    IMG[0];

  return (
    <a
      href={`/properties/${x.id}`}
      className="property-card property-card-link"
    >
      <div className="property-image">
        <img src={image} alt={x.title} />

        <span>
          {x.propertyType}
        </span>
      </div>

      <div className="property-copy">
        <h3>{x.title}</h3>

        <p>{x.location}</p>

        <div className="meta">
          {x.bedrooms || 0} bed
          {" · "}
          {x.bathrooms || 0} bath
          {" · "}
          {(x.area || 0).toLocaleString()} sq ft
        </div>

        <strong>
          {money(x.price, x.purpose)}
        </strong>
      </div>
    </a>
  );
}

function Story(){return <section className="section"><div className="wrap two-col"><div className="story-image"><img src={IMG[3]} alt="Dubai home"/></div><div className="story-copy"><p className="kicker">Trust built with every move</p><h2 className="serif">Real estate expertise, with a human approach</h2><p>Buying, renting or selling property is a major decision. Our focus is simple: clear guidance, strong market knowledge and a smooth experience from the first conversation to the final move.</p><a className="button-outline" href="/about">Discover more</a></div></div></section>;}

function MarketPanel() {
  return (
    <section className="section market-panel-section">
      <div className="wrap">

        <div className="panel market-panel">

          <div className="market-panel-copy">

            <p className="kicker">
              Your guide to today's market
            </p>

            <h2 className="serif">
              Dubai property
              <br />
              market updates
            </h2>

            <p>
              Market intelligence for buyers, sellers,
              landlords, tenants and investors, presented
              clearly and without the noise.
            </p>

            <a
              className="button-coral market-panel-button"
              href="/insights"
            >
              Explore insights
            </a>

          </div>

          <div className="market-panel-visual">

            <div className="market-image-wrap">
              <img
                src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=90"
                alt="Dubai skyline"
              />

              <div className="market-image-overlay">
                <span>Dubai</span>
                <strong>2026</strong>
              </div>
            </div>

            <div className="market-report-card">
              <span>GOLDEN KEY</span>
              <strong>
                MARKET
                <br />
                REPORT
              </strong>
              <small>
                Dubai Property Intelligence
              </small>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
function GlobalSection(){return <section className="section"><div className="wrap global"><div><p className="kicker">A wider audience for your property</p><h2 className="serif">Better exposure. Better opportunities.</h2><p>When the right property meets the right audience, the result is more than a listing.</p><a href="/services" className="underlink">How we work →</a></div><div className="global-box">{[["70","countries"],["550","companies"],["4,800","offices"],["134k","associates"]].map(([a,b])=><div key={b}><b>{a}</b><span>{b}</span></div>)}</div></div></section>;}

function Reviews(){const r=["Exceptional service from the first conversation to the final handover.","Clear advice, excellent communication and a team that genuinely listened.","A smooth, professional experience. We always knew what came next."];const [i,setI]=useState(0);useEffect(()=>{const t=setInterval(()=>setI(x=>(x+1)%r.length),3200);return()=>clearInterval(t)},[]);return <section className="section review-section"><div className="wrap review-wrap"><p className="kicker centered">Your experience is our measure of success</p><h2 className="serif centered">What our clients say</h2><div className="review"><div className="stars">★★★★★</div><p>“{r[i]}”</p><span>Verified client</span><div className="dots">{r.map((_,x)=><button key={x} className={x===i?"active":""} onClick={()=>setI(x)}/>)}</div></div></div></section>;}

function Articles(){const a=[["Dubai residential market update","Insights",IMG[1]],["What buyers should know before purchasing","Guides",IMG[2]],["The neighbourhoods to watch this year","Insights",IMG[3]],["A practical guide to renting in Dubai","Guides",IMG[0]]];return <section className="section"><div className="wrap"><div className="row-head"><div><p className="kicker">Further reading</p><h2 className="serif">Insights and guides</h2></div><a href="/insights" className="underlink">View all →</a></div><div className="articles">{a.map(([t,k,img])=><article key={t}><img src={img} alt={t}/><small>{k}</small><h3>{t}</h3><a href={k==="Guides"?"/guides":"/insights"}>Read more →</a></article>)}</div></div></section>;}

function Enquire(){const[sent,setSent]=useState(false);return <section className="section enquiry" id="enquire"><div className="wrap enquiry-grid"><div><p className="kicker light">Let's talk property</p><h2 className="serif light">Speak with us today</h2><p className="light-text">Tell us what you are looking for and our team can take it from there.</p></div>{sent?<div className="success">Thank you. Your enquiry has been received.</div>:<form onSubmit={e=>{e.preventDefault();setSent(true)}}><div className="form-row"><input required placeholder="First name"/><input required placeholder="Last name"/></div><input required type="email" placeholder="Email address"/><input required placeholder="Phone number"/><select><option>I'm interested in...</option><option>Buying</option><option>Renting</option><option>Selling</option></select><textarea placeholder="How can we help?" rows="4"/><button className="button-coral">Submit enquiry</button></form>}</div></section>;}

function Footer(){return <footer className="footer"><div className="wrap footer-top"><div><a href="/" className="logo footer-logo">better<span>homes</span></a><p>Real estate, thoughtfully done.</p></div><div><h4>Explore</h4><a href="/buy">Buy</a><a href="/rent">Rent</a><a href="/services">Services</a></div><div><h4>Knowledge</h4><a href="/insights">Insights</a><a href="/guides">Guides</a><a href="/about">About</a></div><div><h4>Contact</h4><a href="/enquire">Enquire now</a><span>Dubai, UAE</span></div></div><div className="wrap footer-bottom"><span>© 2026 Betterhomes — Demo build</span><span>Privacy · Terms</span></div></footer>;}

function Page({title,kicker,text,children}){
  return <>
    <Header/>
    <main>
      <section className="page-hero">
        <div className="wrap">
          <p className="kicker">{kicker}</p>
          <h1 className="serif">{title}</h1>
          <p>{text}</p>
        </div>
      </section>
      {children || (
        <section className="section">
          <div className="wrap page-placeholder">
            <h2 className="serif">Content area ready</h2>
            <p>This page is ready for the client's final content.</p>
          </div>
        </section>
      )}
    </main>
    <Footer/>
  </>;
}

function ListingPage({ rent = false }) {
  const targetPurpose = rent ? "rent" : "buy";

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPixxiListings() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/pixxi/properties?purpose=${targetPurpose}&page=1&size=100`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Could not load CRM listings."
          );
        }

        if (!cancelled) {
          setProperties(
            Array.isArray(data.properties)
              ? data.properties
              : []
          );
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "We couldn't load the latest properties right now."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPixxiListings();

    return () => {
      cancelled = true;
    };
  }, [targetPurpose]);

  const list = properties.filter((property) => {
    const searchText =
      `${property.title || ""} ${property.location || ""} ${property.city || ""}`
        .toLowerCase();

    const matchesSearch =
      !search ||
      searchText.includes(
        search.toLowerCase()
      );

    const matchesType =
      !type ||
      property.propertyType === type;

    return (
      matchesSearch &&
      matchesType
    );
  });

  const availableTypes = [
    ...new Set(
      properties
        .map((property) =>
          property.propertyType
        )
        .filter(Boolean)
    ),
  ];

  return (
    <Page
      title={
        rent
          ? "Find a home to rent"
          : "Find a home to buy"
      }
      kicker={
        rent ? "Rent" : "Buy"
      }
      text="Browse the latest properties available through Golden Key."
    >

      <section className="section">
        <div className="wrap">

          <div className="listing-filters">

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Location, community or building"
            />

            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value)
              }
            >
              <option value="">
                Any property type
              </option>

              {availableTypes.map(
                (propertyType) => (
                  <option
                    key={propertyType}
                    value={propertyType}
                  >
                    {propertyType}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              className="button-coral"
            >
              Search
            </button>

          </div>

          {loading && (
            <div className="empty-state">
              <h3 className="serif">
                Loading properties...
              </h3>
              <p>
                Getting the latest listings
                from Golden Key.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="empty-state">
              <h3 className="serif">
                Properties temporarily unavailable
              </h3>
              <p>
                {error}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            list.length > 0 && (
              <div className="listing-grid">

                {list.map((property) => (
                  <PropertyCard
                    key={
                      property.id ||
                      property.reference
                    }
                    x={property}
                  />
                ))}

              </div>
            )}

          {!loading &&
            !error &&
            list.length === 0 && (
              <div className="empty-state">

                <h3 className="serif">
                  No properties found
                </h3>

                <p>
                  Try another location or
                  property type.
                </p>

              </div>
            )}

        </div>
      </section>

    </Page>
  );
}

function csvEscape(v){const s=String(v??"");return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s}
const CSV_COLUMNS=["title","purpose","location","price","propertyType","bedrooms","area","image","status"];

function downloadSampleCsv(purpose){
  const headers=CSV_COLUMNS.join(",");
  const sample=[purpose==="rent"?["Example rental apartment","rent","Dubai Marina","12500","Apartment","2","1240","","published"]:["Example sale apartment","buy","Downtown Dubai","2100000","Apartment","1","842","","published"]];
  const csv=[headers,sample.map(csvEscape).join(",")].join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`betterhomes-${purpose}-sample-layout.csv`;a.click();URL.revokeObjectURL(a.href);
}

function parseCsv(text){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}if(c==='"'){quoted=!quoted;continue}if(c===','&&!quoted){row.push(cell);cell="";continue}if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row);row=[];cell="";continue}cell+=c}if(cell.length||row.length){row.push(cell);if(row.some(v=>v.trim()!==""))rows.push(row)}if(rows.length<2)return[];const headers=rows[0].map(h=>h.trim());return rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]||"").trim()])));}
function csvToProperty(obj, purpose) {
  const p = (obj.purpose || purpose || "").toLowerCase();

  return {
    id: crypto.randomUUID(),

    title: obj.title || "Untitled property",
    purpose: p === "rent" ? "rent" : "buy",

    location: obj.location || "",
    price: Number(obj.price) || 0,

    propertyType: obj.propertyType || "Apartment",
    bedrooms: Number(obj.bedrooms) || 0,
    bathrooms: Number(obj.bathrooms) || 0,
    area: Number(obj.area) || 0,

    description: obj.description || "",

    images: [
      obj.image1 || obj.image || "",
      obj.image2 || "",
      obj.image3 || "",
      obj.image4 || "",
      obj.image5 || "",
    ].filter(Boolean),

    status:
      (obj.status || "draft").toLowerCase() === "published"
        ? "published"
        : "draft",
  };
}

function Admin() {
  const [adminMode, setAdminMode] = useState("listings");

  /* =========================================================
     EXISTING PROPERTY LISTING LOGIC
     ========================================================= */

  const [purpose, setPurpose] = useState("buy");
  const [properties, setProperties] = useState([]);
  const [message, setMessage] = useState("");

  // Tracks whether the initial listing load has finished.
  const [loaded, setLoaded] = useState(false);

  const emptyForm = {
    title: "",
    location: "",
    price: "",
    propertyType: "Apartment",
    bedrooms: "",
    bathrooms: "",
    area: "",
    description: "",
    image1: "",
    image2: "",
    image3: "",
    image4: "",
    image5: "",
    status: "published",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadProperties().then((data) => {
      setProperties(data);
      setLoaded(true);
    });
  }, []);

  const current = properties.filter(
    (p) =>
      String(p.purpose || "").toLowerCase() ===
      String(purpose || "").toLowerCase()
  );

  const update = (patch) => {
    setForm((f) => ({
      ...f,
      ...patch,
    }));
  };

  // Existing listing persistence logic kept intact.
  const persist = (updater) => {
    const stored = readStoredProperties();
    const base = stored || properties;

    const next =
      typeof updater === "function"
        ? updater(base)
        : updater;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next)
    );

    setProperties(next);

    window.dispatchEvent(
      new Event("properties-updated")
    );

    return next;
  };

  function addManual(e) {
    e.preventDefault();

    const newListing = csvToProperty(
      {
        ...form,
        purpose,
        status: form.status || "published",
      },
      purpose
    );

    persist((currentList) => [
      ...currentList,
      newListing,
    ]);

    setMessage(
      `${purpose === "buy" ? "Buy" : "Rent"} listing added successfully.`
    );

    setForm(emptyForm);
  }

  function remove(id) {
    persist((currentList) =>
      currentList.filter(
        (p) => p.id !== id
      )
    );

    setMessage("Listing removed.");
  }

  async function importCsv(file) {
    const text = await file.text();
    const raw = parseCsv(text);

    if (!raw.length) {
      setMessage(
        "CSV could not be read. Use the sample layout."
      );
      return;
    }

    const missing = CSV_COLUMNS.filter(
      (c) => !(c in raw[0])
    );

    if (missing.length) {
      setMessage(
        `Missing CSV columns: ${missing.join(", ")}`
      );
      return;
    }

    const imported = raw.map((r) =>
      csvToProperty(r, purpose)
    );

    persist((currentList) => [
      ...currentList,
      ...imported,
    ]);

    setMessage(
      `${imported.length} ${
        purpose === "buy" ? "Buy" : "Rent"
      } listing(s) imported.`
    );
  }

  /* =========================================================
     AREA GUIDES LOGIC
     ========================================================= */

  const AREA_GUIDES_KEY =
    "betterhomes.area-guides.v1";

  const [areaGuides, setAreaGuides] = useState([]);
  const [guidesLoaded, setGuidesLoaded] = useState(false);

  const emptyGuideForm = {
    title: "",
    location: "",
    readTime: "5 min read",
    excerpt: "",
    heroImage: "",
    mapImage: "",
    image2: "",
    image3: "",
    image4: "",
    image5: "",
    intro: "",
    about: "",
    living: "",
    market: "",
    schools: "",
    lifestyle: "",
    transport: "",
    status: "published",
  };

  const [guideForm, setGuideForm] =
    useState(emptyGuideForm);

  function readAdminAreaGuides() {
    const stored = localStorage.getItem(
      AREA_GUIDES_KEY
    );

    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (Array.isArray(parsed.guides)) {
        return parsed.guides;
      }

      return null;
    } catch (error) {
      console.error(
        "Error reading area guides:",
        error
      );

      return null;
    }
  }

  async function loadAdminAreaGuides() {
    try {
      const stored = readAdminAreaGuides();

      if (stored) {
        setAreaGuides(stored);
        setGuidesLoaded(true);
        return;
      }

      let seedGuides = [];

      try {
        const response = await fetch(
          "/data/area-guides.json"
        );

        if (response.ok) {
          const data = await response.json();

          seedGuides = Array.isArray(data)
            ? data
            : data.guides || [];
        }
      } catch (error) {
        console.warn(
          "Area guide seed file could not be loaded:",
          error
        );
      }

      const latest = readAdminAreaGuides();

      if (latest) {
        setAreaGuides(latest);
      } else {
        localStorage.setItem(
          AREA_GUIDES_KEY,
          JSON.stringify(seedGuides)
        );

        setAreaGuides(seedGuides);
      }

      setGuidesLoaded(true);
    } catch (error) {
      console.error(
        "Error loading area guides:",
        error
      );

      setAreaGuides([]);
      setGuidesLoaded(true);
    }
  }

  useEffect(() => {
    loadAdminAreaGuides();

    const refreshGuides = () => {
      const latest = readAdminAreaGuides();

      if (latest) {
        setAreaGuides(latest);
      }
    };

    window.addEventListener(
      "area-guides-updated",
      refreshGuides
    );

    window.addEventListener(
      "storage",
      refreshGuides
    );

    return () => {
      window.removeEventListener(
        "area-guides-updated",
        refreshGuides
      );

      window.removeEventListener(
        "storage",
        refreshGuides
      );
    };
  }, []);

  const updateGuide = (patch) => {
    setGuideForm((currentForm) => ({
      ...currentForm,
      ...patch,
    }));
  };

  const persistGuides = (updater) => {
    const stored = readAdminAreaGuides();
    const base = stored || areaGuides;

    const next =
      typeof updater === "function"
        ? updater(base)
        : updater;

    localStorage.setItem(
      AREA_GUIDES_KEY,
      JSON.stringify(next)
    );

    setAreaGuides(next);

    window.dispatchEvent(
      new Event("area-guides-updated")
    );

    return next;
  };

  function makeGuideId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `guide-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  function makeGuideSlug(title) {
    return String(title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function addAreaGuide(e) {
    e.preventDefault();

    const title =
      guideForm.title.trim();

    if (!title) {
      setMessage(
        "Please enter an area guide title."
      );
      return;
    }

    const slug = makeGuideSlug(title);

    const existingSlug = areaGuides.some(
      (guide) =>
        String(guide.slug || "")
          .toLowerCase() ===
        slug.toLowerCase()
    );

    if (existingSlug) {
      setMessage(
        "An area guide with this title already exists."
      );
      return;
    }

    const newGuide = {
      id: makeGuideId(),
      slug,
      ...guideForm,
    };

    persistGuides(
      (currentGuides) => [
        ...currentGuides,
        newGuide,
      ]
    );

    setMessage(
      `${title} added successfully.`
    );

    setGuideForm(
      emptyGuideForm
    );
  }

  function removeAreaGuide(id) {
    persistGuides(
      (currentGuides) =>
        currentGuides.filter(
          (guide) =>
            guide.id !== id
        )
    );

    setMessage(
      "Area guide removed."
    );
  }

  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="admin-page">

      {/* TOP BAR */}

      <div className="admin-top">

        <div>
          <a
            href="/"
            className="logo"
          >
            better<span>homes</span>
          </a>

          <p>
            Private Website Administration
          </p>
        </div>

        <a
          href="/"
          className="admin-back"
        >
          ← Back to website
        </a>

      </div>

      <main className="admin-main">

        {/* ADMIN MODE HEADER */}

        <section className="admin-head">

          <div>

            <p className="kicker">
              Admin portal
            </p>

            <h1 className="serif">
              Manage website content
            </h1>

            <p>
              Manage property listings and area
              guides that appear on the public website.
            </p>

          </div>

          <div className="admin-mode-toggle">

            <button
              type="button"
              className={
                adminMode === "listings"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setAdminMode("listings")
              }
            >
              Listings
            </button>

            <button
              type="button"
              className={
                adminMode === "guides"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setAdminMode("guides")
              }
            >
              Area Guides
            </button>

          </div>

        </section>

        {/* =================================================
            LISTINGS MODE
            ================================================= */}

        {adminMode === "listings" && (
          <>

            <section className="admin-head">

              <div>

                <p className="kicker">
                  Property listings
                </p>

                <h2 className="serif">
                  Manage property listings
                </h2>

                <p>
                  Add and publish the listings
                  that appear on the public Buy
                  and Rent pages. No visitor can
                  create a listing.
                </p>

              </div>

              <div className="purpose-toggle">

                <button
                  type="button"
                  className={
                    purpose === "buy"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPurpose("buy")
                  }
                >
                  Buy
                </button>

                <button
                  type="button"
                  className={
                    purpose === "rent"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPurpose("rent")
                  }
                >
                  Rent
                </button>

              </div>

            </section>

            <section className="admin-grid">

              {/* ADD LISTING */}

              <div className="admin-card">

                <div className="card-head">

                  <div>

                    <h2>
                      Add {purpose} listing
                    </h2>

                    <p>
                      Manual entry for one property.
                    </p>

                  </div>

                </div>

                {!loaded && (
                  <p className="admin-note">
                    Loading existing listings…
                  </p>
                )}

                <form
                  onSubmit={addManual}
                  className="admin-form"
                >

                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      update({
                        title: e.target.value,
                      })
                    }
                    placeholder="Property title"
                  />

                  <input
                    required
                    value={form.location}
                    onChange={(e) =>
                      update({
                        location:
                          e.target.value,
                      })
                    }
                    placeholder="Location"
                  />

                  <div className="form-row">

                    <input
                      required
                      type="number"
                      value={form.price}
                      onChange={(e) =>
                        update({
                          price:
                            e.target.value,
                        })
                      }
                      placeholder={
                        purpose === "rent"
                          ? "Monthly rent"
                          : "Sale price"
                      }
                    />

                    <select
                      value={
                        form.propertyType
                      }
                      onChange={(e) =>
                        update({
                          propertyType:
                            e.target.value,
                        })
                      }
                    >

                      <option>
                        Apartment
                      </option>

                      <option>
                        Villa
                      </option>

                      <option>
                        Townhouse
                      </option>

                      <option>
                        Penthouse
                      </option>

                      <option>
                        Office
                      </option>

                      <option>
                        Retail
                      </option>

                      <option>
                        Warehouse
                      </option>

                    </select>

                  </div>

                  <div className="form-row">

                    <input
                      type="number"
                      value={
                        form.bedrooms
                      }
                      onChange={(e) =>
                        update({
                          bedrooms:
                            e.target.value,
                        })
                      }
                      placeholder="Bedrooms"
                    />

                    <input
                      type="number"
                      value={
                        form.bathrooms
                      }
                      onChange={(e) =>
                        update({
                          bathrooms:
                            e.target.value,
                        })
                      }
                      placeholder="Bathrooms"
                    />

                  </div>

                  <input
                    type="number"
                    value={form.area}
                    onChange={(e) =>
                      update({
                        area:
                          e.target.value,
                      })
                    }
                    placeholder="Area (sq ft)"
                  />

                  <textarea
                    value={
                      form.description
                    }
                    onChange={(e) =>
                      update({
                        description:
                          e.target.value,
                      })
                    }
                    placeholder="Property description"
                    rows="5"
                  />

                  <div className="image-input-section">

                    <div className="image-input-title">
                      Property Images
                    </div>

                    <p className="image-input-help">
                      Add up to 5 property image
                      URLs. The first image becomes
                      the main property image.
                    </p>

                    {[1, 2, 3, 4, 5].map(
                      (number) => (
                        <div
                          className="image-input-row"
                          key={number}
                        >

                          <div className="image-number">
                            {number}
                          </div>

                          <input
                            value={
                              form[
                                `image${number}`
                              ]
                            }
                            onChange={(e) =>
                              update({
                                [`image${number}`]:
                                  e.target.value,
                              })
                            }
                            placeholder={
                              `Image ${number} URL`
                            }
                          />

                        </div>
                      )
                    )}

                  </div>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      update({
                        status:
                          e.target.value,
                      })
                    }
                  >

                    <option value="published">
                      Publish immediately
                    </option>

                    <option value="draft">
                      Save as draft
                    </option>

                  </select>

                  <button
                    className="button-coral"
                    type="submit"
                    disabled={!loaded}
                  >
                    Add {purpose} listing
                  </button>

                </form>

              </div>

              {/* CSV */}

              <div className="admin-card csv-card">

                <div className="card-head">

                  <div>

                    <h2>
                      CSV tools
                    </h2>

                    <p>
                      Import many listings without
                      hardcoded data.
                    </p>

                  </div>

                </div>

                <div className="csv-actions">

                  <button
                    className="tool-button"
                    type="button"
                    onClick={() =>
                      downloadSampleCsv(
                        purpose
                      )
                    }
                  >
                    ↓ Download sample{" "}
                    {purpose} CSV layout
                  </button>

                  <label className="tool-button">

                    ↑ Upload {purpose} CSV

                    <input
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      disabled={!loaded}
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        importCsv(
                          e.target.files[0]
                        )
                      }
                    />

                  </label>

                  <a
                    className="tool-button"
                    href="/admin"
                  >
                    ↻ Refresh admin data
                  </a>

                </div>

                <div className="csv-schema">

                  <strong>
                    Required columns
                  </strong>

                  <code>
                    {CSV_COLUMNS.join(
                      ", "
                    )}
                  </code>

                </div>

              </div>

            </section>

            {message && (
              <div className="admin-message">
                {message}
              </div>
            )}

            {/* LISTINGS TABLE */}

            <section className="admin-card">

              <div className="card-head">

                <div>

                  <h2>
                    {purpose === "buy"
                      ? "Buy"
                      : "Rent"}{" "}
                    listings
                  </h2>

                  <p>
                    {current.length} listing(s)
                    in the admin data store.
                  </p>

                </div>

              </div>

              <div className="admin-table-wrap">

                <table>

                  <thead>

                    <tr>
                      <th>Property</th>
                      <th>Location</th>
                      <th>Type</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th></th>
                    </tr>

                  </thead>

                  <tbody>

                    {current.length ? (
                      current.map((p) => (

                        <tr key={p.id}>

                          <td>

                            <strong>
                              {p.title}
                            </strong>

                            <small>
                              {p.bedrooms} bed ·{" "}
                              {p.area} sq ft
                            </small>

                          </td>

                          <td>
                            {p.location}
                          </td>

                          <td>
                            {p.propertyType}
                          </td>

                          <td>
                            {money(
                              p.price,
                              p.purpose
                            )}
                          </td>

                          <td>

                            <span
                              className={
                                p.status ===
                                "published"
                                  ? "status live"
                                  : "status"
                              }
                            >
                              {p.status}
                            </span>

                          </td>

                          <td>

                            <button
                              className="delete-button"
                              type="button"
                              onClick={() =>
                                remove(p.id)
                              }
                            >
                              Delete
                            </button>

                          </td>

                        </tr>

                      ))
                    ) : (

                      <tr>

                        <td
                          colSpan="6"
                          className="table-empty"
                        >
                          No {purpose} listings yet.
                          Add one above or upload
                          a CSV.
                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </section>

            <div className="admin-note">
              Development note: this demo stores
              listings in browser localStorage. The
              same data contract can be moved directly
              to Supabase/PostgreSQL for production
              without changing the CSV layout.
            </div>

          </>
        )}

        {/* =================================================
            AREA GUIDES MODE
            ================================================= */}

        {adminMode === "guides" && (
          <>

            <section className="admin-head">

              <div>

                <p className="kicker">
                  Area guides
                </p>

                <h2 className="serif">
                  Manage Dubai area guides
                </h2>

                <p>
                  Add and publish community guides
                  that appear on the public Area Guides
                  page.
                </p>

              </div>

            </section>

            <section className="admin-grid">

              {/* ADD AREA GUIDE */}

              <div className="admin-card">

                <div className="card-head">

                  <div>

                    <h2>
                      Add Area Guide
                    </h2>

                    <p>
                      Create a complete guide for a
                      Dubai community.
                    </p>

                  </div>

                </div>

                {!guidesLoaded && (
                  <p className="admin-note">
                    Loading existing area guides…
                  </p>
                )}

                <form
                  onSubmit={addAreaGuide}
                  className="admin-form"
                >

                  <input
                    required
                    value={guideForm.title}
                    onChange={(e) =>
                      updateGuide({
                        title:
                          e.target.value,
                      })
                    }
                    placeholder="Guide title e.g. Al Barsha 3 area guide"
                  />

                  <input
                    value={
                      guideForm.location
                    }
                    onChange={(e) =>
                      updateGuide({
                        location:
                          e.target.value,
                      })
                    }
                    placeholder="Location e.g. Al Barsha 3, Dubai"
                  />

                  <input
                    value={
                      guideForm.readTime
                    }
                    onChange={(e) =>
                      updateGuide({
                        readTime:
                          e.target.value,
                      })
                    }
                    placeholder="Reading time e.g. 5 min read"
                  />

                  <textarea
                    required
                    value={
                      guideForm.excerpt
                    }
                    onChange={(e) =>
                      updateGuide({
                        excerpt:
                          e.target.value,
                      })
                    }
                    placeholder="Short description shown on the Area Guides cards"
                    rows="4"
                  />

                  {/* IMAGES */}

                  <div className="image-input-section">

                    <div className="image-input-title">
                      Guide Images
                    </div>

                    <p className="image-input-help">
                      Add image URLs. Hero image is
                      the main card and guide image.
                    </p>

                    <input
                      required
                      value={
                        guideForm.heroImage
                      }
                      onChange={(e) =>
                        updateGuide({
                          heroImage:
                            e.target.value,
                        })
                      }
                      placeholder="Hero image URL"
                    />

                    <input
                      value={
                        guideForm.mapImage
                      }
                      onChange={(e) =>
                        updateGuide({
                          mapImage:
                            e.target.value,
                        })
                      }
                      placeholder="Map image URL"
                    />

                    {[2, 3, 4, 5].map(
                      (number) => (
                        <input
                          key={number}
                          value={
                            guideForm[
                              `image${number}`
                            ]
                          }
                          onChange={(e) =>
                            updateGuide({
                              [`image${number}`]:
                                e.target.value,
                            })
                          }
                          placeholder={
                            `Guide image ${number} URL`
                          }
                        />
                      )
                    )}

                  </div>

                  {/* CONTENT */}

                  <textarea
                    value={guideForm.intro}
                    onChange={(e) =>
                      updateGuide({
                        intro:
                          e.target.value,
                      })
                    }
                    placeholder="Introduction"
                    rows="5"
                  />

                  <textarea
                    value={
                      guideForm.about
                    }
                    onChange={(e) =>
                      updateGuide({
                        about:
                          e.target.value,
                      })
                    }
                    placeholder="About the area"
                    rows="5"
                  />

                  <textarea
                    value={
                      guideForm.living
                    }
                    onChange={(e) =>
                      updateGuide({
                        living:
                          e.target.value,
                      })
                    }
                    placeholder="Living in the area"
                    rows="5"
                  />

                  <textarea
                    value={
                      guideForm.market
                    }
                    onChange={(e) =>
                      updateGuide({
                        market:
                          e.target.value,
                      })
                    }
                    placeholder="Property market information"
                    rows="5"
                  />

                  <textarea
                    value={
                      guideForm.schools
                    }
                    onChange={(e) =>
                      updateGuide({
                        schools:
                          e.target.value,
                      })
                    }
                    placeholder="Schools and education"
                    rows="4"
                  />

                  <textarea
                    value={
                      guideForm.lifestyle
                    }
                    onChange={(e) =>
                      updateGuide({
                        lifestyle:
                          e.target.value,
                      })
                    }
                    placeholder="Lifestyle and things to do"
                    rows="4"
                  />

                  <textarea
                    value={
                      guideForm.transport
                    }
                    onChange={(e) =>
                      updateGuide({
                        transport:
                          e.target.value,
                      })
                    }
                    placeholder="Getting around / transport"
                    rows="4"
                  />

                  <select
                    value={
                      guideForm.status
                    }
                    onChange={(e) =>
                      updateGuide({
                        status:
                          e.target.value,
                      })
                    }
                  >

                    <option value="published">
                      Publish immediately
                    </option>

                    <option value="draft">
                      Save as draft
                    </option>

                  </select>

                  <button
                    className="button-coral"
                    type="submit"
                    disabled={!guidesLoaded}
                  >
                    Add Area Guide
                  </button>

                </form>

              </div>

              {/* AREA GUIDE INFO CARD */}

              <div className="admin-card csv-card">

                <div className="card-head">

                  <div>

                    <h2>
                      Area Guide publishing
                    </h2>

                    <p>
                      Public guide workflow.
                    </p>

                  </div>

                </div>

                <div className="csv-actions">

                  <a
                    className="tool-button"
                    href="/guides/area-guides"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ↗ View Area Guides page
                  </a>

                  <a
                    className="tool-button"
                    href="/guides/area-guides/al-barsha-3"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ↗ View sample guide
                  </a>

                </div>

                <div className="csv-schema">

                  <strong>
                    Guide URL format
                  </strong>

                  <code>
                    /guides/area-guides/
                    &lt;guide-slug&gt;
                  </code>

                  <p>
                    The slug is generated automatically
                    from the guide title.
                  </p>

                </div>

              </div>

            </section>

            {message && (
              <div className="admin-message">
                {message}
              </div>
            )}

            {/* AREA GUIDE TABLE */}

            <section className="admin-card">

              <div className="card-head">

                <div>

                  <h2>
                    Existing Area Guides
                  </h2>

                  <p>
                    {areaGuides.length} guide(s)
                    in the admin data store.
                  </p>

                </div>

              </div>

              <div className="admin-table-wrap">

                <table>

                  <thead>

                    <tr>
                      <th>Guide</th>
                      <th>Location</th>
                      <th>URL</th>
                      <th>Status</th>
                      <th></th>
                    </tr>

                  </thead>

                  <tbody>

                    {areaGuides.length ? (
                      areaGuides.map(
                        (guide) => (

                          <tr
                            key={guide.id}
                          >

                            <td>

                              <strong>
                                {guide.title}
                              </strong>

                              <small>
                                {guide.readTime ||
                                  "5 min read"}
                              </small>

                            </td>

                            <td>
                              {guide.location ||
                                "—"}
                            </td>

                            <td>

                              <a
                                href={`/guides/area-guides/${guide.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color:
                                    "var(--ink)",
                                  fontSize:
                                    "12px",
                                }}
                              >
                                /guides/area-guides/
                                {guide.slug}
                              </a>

                            </td>

                            <td>

                              <span
                                className={
                                  guide.status ===
                                  "published"
                                    ? "status live"
                                    : "status"
                                }
                              >
                                {guide.status ||
                                  "draft"}
                              </span>

                            </td>

                            <td>

                              <button
                                className="delete-button"
                                type="button"
                                onClick={() =>
                                  removeAreaGuide(
                                    guide.id
                                  )
                                }
                              >
                                Delete
                              </button>

                            </td>

                          </tr>

                        )
                      )
                    ) : (

                      <tr>

                        <td
                          colSpan="5"
                          className="table-empty"
                        >
                          No area guides yet.
                          Add your first guide above.
                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </section>

            <div className="admin-note">
              Area guides are currently stored in
              browser localStorage for this demo.
              They can later be moved to Supabase/
              PostgreSQL without changing the public
              guide structure.
            </div>

          </>
        )}

      </main>

    </div>
  );
}

function PropertyDetail({ id }) {
  const properties = useProperties();

  const property = properties.find(
    (item) => item.id === id
  );

  const [activeImage, setActiveImage] = useState(0);

  if (!property) {
    return (
      <>
        <Header />

        <main className="page-placeholder">
          <div className="wrap">
            <h1 className="serif">
              Property not found
            </h1>

            <a
              href={
                property?.purpose === "rent"
                  ? "/rent"
                  : "/buy"
              }
              className="underlink"
            >
              ← Back to listings
            </a>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  const images =
    property.images?.length
      ? property.images
      : property.image
      ? [property.image]
      : [IMG[0]];

  return (
    <>
      <Header />

      <main className="property-detail">

        <div className="wrap">

          <div className="property-breadcrumb">
            <a
              href={
                property.purpose === "rent"
                  ? "/rent"
                  : "/buy"
              }
            >
              {property.purpose === "rent"
                ? "Rent"
                : "Buy"}
            </a>

            <span>/</span>

            <span>{property.location}</span>
          </div>

          <section className="detail-gallery">

            <div className="detail-main-image">
              <img
                src={images[activeImage]}
                alt={property.title}
              />
            </div>

            <div className="detail-thumbnails">

              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  className={
                    activeImage === index
                      ? "thumbnail active"
                      : "thumbnail"
                  }
                  onClick={() =>
                    setActiveImage(index)
                  }
                >
                  <img
                    src={image}
                    alt={`${property.title} ${index + 1}`}
                  />
                </button>
              ))}

            </div>

          </section>

          <section className="detail-content">

            <div className="detail-main">

              <p className="kicker">
                {property.propertyType}
              </p>

              <h1 className="serif">
                {property.title}
              </h1>

              <p className="detail-location">
                {property.location}
              </p>

              <div className="detail-price">
                {money(
                  property.price,
                  property.purpose
                )}
              </div>

              <div className="property-specs">

                <div>
                  <strong>
                    {property.bedrooms || 0}
                  </strong>

                  <span>Bedrooms</span>
                </div>

                <div>
                  <strong>
                    {property.bathrooms || 0}
                  </strong>

                  <span>Bathrooms</span>
                </div>

                <div>
                  <strong>
                    {(property.area || 0).toLocaleString()}
                  </strong>

                  <span>Sq Ft</span>
                </div>

              </div>

              <div className="detail-description">

                <h2 className="serif">
                  Property Description
                </h2>

                <p>
                  {property.description ||
                    "Contact our team for further information about this property."}
                </p>

              </div>

            </div>

            <aside className="detail-contact">

              <div className="contact-card">

                <h3>
                  Interested in this property?
                </h3>

                <p>
                  Send an enquiry and our team will
                  get back to you.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();

                    alert(
                      "Your enquiry has been submitted."
                    );
                  }}
                >
                  <input
                    required
                    placeholder="Your name"
                  />

                  <input
                    required
                    type="email"
                    placeholder="Email address"
                  />

                  <input
                    required
                    placeholder="Phone number"
                  />

                  <textarea
                    rows="4"
                    placeholder="Message"
                    defaultValue={`I'm interested in ${property.title}`}
                  />

                  <button className="button-coral">
                    Send enquiry
                  </button>
                </form>

              </div>

            </aside>

          </section>

        </div>

      </main>

      <Footer />
    </>
  );
  
}


function About() {
  const team = [
    {
      name: "Zaid Zakariya",
      role: "General Manager",
      image:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Arsalan Altaf",
      role: "Marketing Manager",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Toufik Mirouch",
      role: "Property Consultant",
      image:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Vaishali Thakor",
      role: "Property Consultant",
      image:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Arooj Fatima",
      role: "Property Consultant",
      image:
        "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Niaz Amjad",
      role: "Property Consultant",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Mahmoud Essam",
      role: "Property Consultant",
      image:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Takwa Doral",
      role: "Property Consultant",
      image:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Maria Alcaz",
      role: "Administrator",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=85",
    },
    {
      name: "Sharouk Mousa",
      role: "Property Consultant",
      image:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=700&q=85",
    },
  ];

  const testimonials = [
    {
      quote:
        "The market insight and personalised approach helped me secure a high-yield property in Dubai. Truly world-class service.",
      name: "Ahmed Al Rashid",
      role: "Investor, UAE",
    },
    {
      quote:
        "From the first viewing to handover, the team made buying my dream villa feel seamless and stress-free.",
      name: "Sarah Mitchell",
      role: "Homeowner, UK",
    },
    {
      quote:
        "Their data-driven advisory helped us build a diversified property portfolio with exceptional returns.",
      name: "James & Priya Chen",
      role: "Investors, Singapore",
    },
  ];

  return (
    <>
      <Header />

      <main className="about-page">



{/* HERO */}
<section className="about-hero">
  <div className="about-hero-image" />
  <div className="about-hero-overlay" />

  <div className="wrap about-hero-content">
    <p className="about-label">ABOUT US</p>

    <h1>
      Get to Know Us and Our Commitment to Your Real Estate Needs
    </h1>

    <p className="about-hero-text">
      Discover our transparency, expertise, and unwavering service. We are committed to delivering the best real estate experience by putting our clients first.
    </p>

    <a href="#contact" className="about-gold-link">
      Contact Us →
    </a>
  </div>
</section>

        {/* GOLDEN KEY INTRO */}
        <section className="about-intro section">

          <div className="wrap">

            <p className="about-est">
              EST. 2026
            </p>

            <h2 className="about-gold-title">
              The <span>Golden</span> Key
            </h2>

          </div>

        </section>

        {/* STORY 01 */}
        <section className="about-story section">

          <div className="wrap about-story-row">

            <div className="about-story-copy">

              <p className="about-label gold">
                OUR STORY
              </p>

              <h2 className="serif">
                The Inception of Golden Key Real Estate
              </h2>

              <p>
                Born from a passion to redefine how clients
                buy, sell, and invest in Dubai real estate,
                our company was created around a simple idea:
                provide exceptional service with modern,
                data-driven strategies and a premium advisory
                experience.
              </p>

            </div>

            <div className="about-story-image">
              <img
                src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=88"
                alt="Real estate office"
              />
            </div>

          </div>

        </section>

        {/* STORY 02 */}
        <section className="about-story section">

          <div className="wrap about-story-row reverse">

            <div className="about-story-image">
              <img
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=88"
                alt="Professional meeting"
              />
            </div>

            <div className="about-story-copy">

              <p className="about-label gold">
                OUR STORY
              </p>

              <h2 className="serif">
                Understanding the Sentiment Behind
                Real Estate Acquisition
              </h2>

              <p>
                We believe every property transaction is deeply
                personal. Whether you are buying your first
                investment, moving into a new home, or expanding
                your portfolio, our job is to understand your
                priorities and financial goals.
              </p>

            </div>

          </div>

        </section>

        {/* STORY 03 */}
        <section className="about-story section">

          <div className="wrap about-story-row">

            <div className="about-story-copy">

              <p className="about-label gold">
                OUR STORY
              </p>

              <h2 className="serif">
                Simplifying the Real Estate Buying Process
              </h2>

              <p>
                Our commitment is to ensure that buying real
                estate should be a seamless journey. We handle
                the complexity — from market analysis to legal
                formalities — so you can focus on what matters
                most: finding your perfect property.
              </p>

            </div>

            <div className="about-story-image">

              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=88"
                alt="Real estate team"
              />

            </div>

          </div>

        </section>

        {/* RIGHT PRINCIPLE */}
        <section className="about-philosophy">

          <div className="wrap">

            <p className="about-label gold centered">
              OUR PHILOSOPHY
            </p>

            <h2>
              We operate on the principle of{" "}
              <span>"RIGHT"</span>
            </h2>

            <div className="right-grid">

              <div>
                <div className="right-icon">
                  ⌂
                </div>

                <h3>
                  Right Property
                </h3>

                <p>
                  Matching you with the right property
                  that genuinely fits your goals.
                </p>
              </div>

              <div>
                <div className="right-icon">
                  $
                </div>

                <h3>
                  Right Price
                </h3>

                <p>
                  Leveraging market intelligence to
                  make sure your investment works.
                </p>
              </div>

              <div>
                <div className="right-icon">
                  ◷
                </div>

                <h3>
                  Right Time
                </h3>

                <p>
                  Timing the market with thoughtful
                  guidance and experienced advice.
                </p>
              </div>

            </div>

            <a
              href="#contact"
              className="about-gold-link centered-link"
            >
              Contact Us →
            </a>

          </div>

        </section>

        {/* SERVICES */}
        <section className="about-services section">

          <div className="wrap">

            <p className="about-label gold centered">
              WHAT WE DO
            </p>

            <h2 className="about-section-title">
              Real Estate Solutions
              <br />
              <span>for All Your Needs</span>
            </h2>

            <div className="service-list">

              {[
                [
                  "Buying",
                  "Whether you are looking for your first home, a second residence, or a long-term investment, our advisors help you identify the right opportunity.",
                ],
                [
                  "Selling",
                  "Finding the best buyers for your property is what we do best. Through strategic marketing, data and exposure, we maximise your property's reach and value.",
                ],
                [
                  "Leasing",
                  "Dubai offers exceptional rental opportunities. From short-term holiday lets to long-term residential leases, our team provides tailored solutions.",
                ],
                [
                  "Portfolio Management",
                  "Managing a real estate portfolio requires expertise, attention and strategic thinking. Our advisory team helps protect, optimise and grow your property portfolio.",
                ],
              ].map(([title, text]) => (

                <div
                  className="about-service-row"
                  key={title}
                >

                  <h3>
                    {title}
                  </h3>

                  <p>
                    {text}
                  </p>

                  <a href="#contact">
                    Contact Us →
                  </a>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* LEADERSHIP */}
        <section className="about-leadership">

          <div className="wrap">

            <p className="about-label gold centered">
              LEADERSHIP
            </p>

            <h2>
              A Vision of Luxury
              <br />
              <span>Real Estate in Dubai</span>
            </h2>

            <p>
              As the founder and CEO, I am proud to lead a team
              of real estate experts in Dubai. Our mission is
              clear: to deliver an unmatched advisory experience
              rooted in trust, transparency, and market expertise.
            </p>

            <p>
              Our team of professionals is dedicated to providing
              you with the highest standards of service and expertise.
              We guide you every step of the way, from your first
              consultation to closing your deal — and beyond.
            </p>

          </div>

        </section>

        {/* TEAM */}
        <section className="about-team section">

          <div className="wrap">

            <p className="about-label gold centered">
              OUR TEAM
            </p>

            <h2 className="about-section-title">
              The Real Estate Professionals
              <br />
              <span>You Can Trust</span>
            </h2>

            <div className="team-grid">

              {team.map((member) => (

                <article
                  className="team-card"
                  key={member.name}
                >

                  <div className="team-photo">
                    <img
                      src={member.image}
                      alt={member.name}
                    />
                  </div>

                  <h3>
                    {member.name}
                  </h3>

                  <p>
                    {member.role}
                  </p>

                </article>

              ))}

            </div>

          </div>

        </section>

        {/* TESTIMONIALS */}
        <section className="about-testimonials section">

          <div className="wrap">

            <p className="about-label gold centered">
              TESTIMONIALS
            </p>

            <h2 className="about-section-title">
              Words From Our Clients
            </h2>

            <div className="rating">
              <strong>
                4.7
              </strong>

              <span>
                ★★★★★
              </span>

              <small>
                Based on 200+ client reviews
              </small>
            </div>

            <div className="testimonial-grid">

              {testimonials.map((item) => (

                <article
                  className="testimonial-card"
                  key={item.name}
                >

                  <p>
                    “{item.quote}”
                  </p>

                  <strong>
                    {item.name}
                  </strong>

                  <small>
                    {item.role}
                  </small>

                </article>

              ))}

            </div>

          </div>

        </section>

        {/* CONTACT */}
        <section
          className="about-contact section"
          id="contact"
        >

          <div className="wrap about-contact-grid">

            <div>

              <p className="about-label gold">
                GET IN TOUCH
              </p>

              <h2 className="serif">
                Begin Your Journey
              </h2>

              <p>
                Schedule a confidential consultation
                with our market advisors.
              </p>

              <div className="contact-details">
                <span>
                  ☎ +971-45651830
                </span>

                <span>
                  ✉ info@example.com
                </span>

                <span>
                  ⌖ Dubai, UAE
                </span>
              </div>

              <a
                className="whatsapp-button"
                href="/enquire"
              >
                WhatsApp Us
              </a>

            </div>

            <form
              className="about-contact-form"
              onSubmit={(e) => {
                e.preventDefault();

                alert(
                  "Thank you. Your enquiry has been received."
                );
              }}
            >

              <div className="form-row">

                <input
                  required
                  placeholder="First Name"
                />

                <input
                  required
                  placeholder="Last Name"
                />

              </div>

              <input
                required
                type="email"
                placeholder="Enter Your Email"
              />

              <input
                required
                placeholder="Phone"
              />

              <textarea
                rows="6"
                placeholder="Message"
              />

              <button
                type="submit"
                className="about-submit"
              >
                Send ↗
              </button>

            </form>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

function Guides() {
  const guides = [
    {
      title: "SELLER'S GUIDE",
      text: "Practical guidance to help you prepare, position and sell your property with confidence.",
      path: "/guides/seller-guide",
    },
    {
      title: "BUYER'S GUIDE",
      text: "Understand the buying process, evaluate opportunities and make informed property decisions.",
      path: "/guides/buyer-guide",
    },
    {
      title: "TENANT'S GUIDE",
      text: "Everything you need to know when searching for, renting and moving into your next home.",
      path: "/guides/landlord-guide",
    },
    {
      title: "LANDLORD'S GUIDE",
      text: "Helpful advice for leasing your property, managing tenants and protecting your investment.",
      path: "/guides/landlord-guide",
    },
    {
      title: "AREA GUIDE",
      text: "Explore Dubai's communities, lifestyle, property options and the areas worth knowing.",
      path: "/guides/area-guides",
    },
  ];

  return (
    <>
      <Header />

      <main className="guides-page">

        {/* PAGE HEADER */}
        <section className="guides-header">
          <div className="wrap">
            <div className="guides-breadcrumb">
              Home <span>›</span> Guides
            </div>

            <h1 className="serif">
              Guides
            </h1>
          </div>
        </section>

        {/* HERO IMAGE OVERLAPPING SECTION */}
        <section className="guides-hero">
          <div className="wrap">
            <img
              src="https://prravaspedia.com/wp-content/uploads/2019/10/DUBAI.jpg"
              alt="Dubai Red Orange Sunset Skyline"
            />
          </div>
        </section>

        {/* INTRO */}
        <section className="guides-intro">
          <div className="wrap">

            <p>
              Explore Golden Key Real Estate's practical property
              guides, created to help buyers, sellers, landlords,
              tenants and investors make clearer decisions across
              Dubai's real estate market.
            </p>

            <div className="guides-highlight">
              Looking for useful insights and guidance on Dubai
              real estate? Discover practical advice covering
              everything from buying and selling to renting,
              investing and understanding the city's property market.
            </div>

          </div>
        </section>

        {/* GUIDE CARDS */}
        <section className="guides-list">
          <div className="wrap">

            <div className="guide-grid">

              {guides.map((guide) => (
                <article
                  className="guide-card"
                  key={guide.title}
                >

                  <h2>
                    {guide.title}
                  </h2>

                  <p>
                    {guide.text}
                  </p>

                  <a href={guide.path || "#contact"}>
                    <span>—</span>
                    Continue Reading
                  </a>

                </article>
              ))}

            </div>

          </div>
        </section>

        {/* CTA */}
        <section className="guides-cta">

          <div className="wrap">

            <div className="guides-cta-box">

              <div className="guides-cta-content">

                <h2 className="serif">
                  Connect with Golden Key
                </h2>

                <p>
                  Ready to take your next property decision
                  forward? Speak with our team for clear,
                  professional guidance tailored to your goals.
                </p>

                
                  href="#contact"
                  className="button-coral"
                <a>
                  Contact us
                </a>

              </div>

              <div className="guides-cta-image">
                <img
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85"
                  alt="Golden Key consultation"
                />
              </div>

            </div>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}


function Insights() {
  const insightsList = [
    {
      title: "MARKET REPORT",
      text: "Download Golden Key Market Reports for valuable insights into the latest market trends and UAE real estate market analysis.",
    },
    {
      title: "SOCIAL MEDIA",
      text: "Check our social media updates and get the latest news about our team, deals, partnerships, awards and more.",
    },
    {
      title: "MEDIA LIBRARY",
      text: "Explore all the latest photos, videos, graphs, event updates and other multimedia resources about Golden Key.",
    },
    {
      title: "PRESS COVERAGE",
      text: "Find the latest press coverage and media mentions showcasing our work in various industries and publications.",
    },
    {
      title: "BLOG",
      text: "Get insights, tips, and strategies on various topics from our team through informative and engaging blogs.",
    },
  ];

  return (
    <>
      <Header />

      <main className="insights-page">

        {/* PAGE HEADER */}
        <section className="insights-header">
          <div className="wrap">
            <h1 className="serif">
              Latest news &amp; Insights
            </h1>
          </div>
        </section>

        {/* HERO IMAGE OVERLAPPING SECTION */}
        <section className="insights-hero">
          <div className="wrap">
            <img
              src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1800&q=90"
              alt="Latest news and insights phone reading"
            />
          </div>
        </section>

        {/* INTRO & HIGHLIGHT */}
        <section className="insights-intro">
          <div className="wrap">

            <p>
              Golden Key's latest news and insights page is your ultimate resource for staying up-to-date with the latest trends and developments in the commercial real estate industry in the UAE and worldwide. Our team of experienced consultants, area managers and researchers are dedicated to providing you with the most relevant and informative content on a variety of topics, from market analysis and investment strategies to property management and lease &amp; sales negotiations. Whether you're a property owner, investor, or tenant, our expert insights will keep you informed and help you make smart decisions. Stay ahead of the curve with Golden Key's latest news and insights and gain a competitive edge in today's dynamic commercial real estate landscape.
            </p>

            <div className="insights-highlight">
              Discover the latest industry news, trends, and insights from Golden Key's seasoned commercial real estate consultants and advisors. We keep you informed and empowered with the expert insights and analysis you need to succeed in the ever-changing world of commercial real estate.
            </div>

          </div>
        </section>

        {/* INSIGHT CARDS GRID */}
        <section className="insights-list">
          <div className="wrap">

            <div className="insights-grid">

              {insightsList.map((item) => (
                <article
                  className="insights-card"
                  key={item.title}
                >

                  <h2>
                    {item.title}
                  </h2>

                  <p>
                    {item.text}
                  </p>

                  <a href="#contact">
                    <span className="yellow-dash">—</span>
                    Continue Reading
                  </a>

                </article>
              ))}

            </div>

          </div>
        </section>

        {/* CTA SECTION */}
        <section className="insights-cta">

          <div className="wrap">

            <div className="insights-cta-box">

              <div className="insights-cta-content">

                <h2 className="serif">
                  Connect with Golden Key
                </h2>

                <p>
                  For any queries, collaboration and media requests, please call us at +971 600 56 6224 or submit the contact form by clicking the button below.
                </p>

                <a
                  href="#contact"
                  className="insights-btn-yellow"
                >
                  Contact us
                </a>

              </div>

              <div className="insights-cta-image">
                <img
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85"
                  alt="Business handshake collaboration"
                />
              </div>

            </div>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

function ServicesPage() {
  const services = [
    {
      title: "Property Management",
      path: "/services/property-management",
      text: "Protect your property, simplify ownership and keep your investment performing with dedicated management support.",
      image:
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=88",
    },
    {
      title: "Development Sales & Consultancy",
      path: "/services/development-sales-and-consultancy",
      text: "From project strategy and positioning to sales and launch, we help developers bring the right project to market.",
      image:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=88",
    },
    {
      title: "Property Valuation",
      path: "/services/property-valuation",
      text: "Understand the market value of your property with a professional assessment built around location, demand and comparable evidence.",
      image:
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=88",
    },
    {
      title: "Holiday Home Services",
      path: "/services/holiday-home-services",
      text: "Make short-term property ownership easier with guest, marketing and operational support.",
      image:
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=88",
    },
    {
      title: "Citizenship Program",
      path: "/services/citizenship-program",
      text: "Explore residency and investment pathways with a property-led advisory approach.",
      image:
        "https://images.unsplash.com/photo-1524813686514-a57563d77965?auto=format&fit=crop&w=1400&q=88",
    },
  ];

  return (
    <>
      <Header />

      <main className="services-page">

        {/* HERO */}
        <section className="services-hero">

          <div className="services-hero-bg" />

          <div className="services-hero-overlay" />

          <div className="wrap services-hero-content">

            <p className="kicker light">
              GOLDEN KEY SERVICES
            </p>

            <h1>
              Property services
              <br />
              designed around you
            </h1>

            <p>
              From managing your investment to valuing,
              selling and developing property, Golden Key
              brings specialist support together under one roof.
            </p>

            
            <a
              href="#services-list"
              className="button-gold"
            >
              Explore our services
            </a>

          </div>

        </section>

        {/* INTRO */}
        <section className="section services-intro">

          <div className="wrap services-intro-grid">

            <div>
              <p className="kicker gold-text">
                HOW WE HELP
              </p>

              <h2 className="serif">
                The right service for
                <br />
                every property journey
              </h2>
            </div>

            <p>
              Whether you are an owner, investor, developer
              or buyer, our services are designed to make
              property decisions clearer and execution easier.
              We combine market knowledge with practical,
              hands-on support.
            </p>

          </div>

        </section>

        {/* SERVICES */}
        <section
          className="section services-directory"
          id="services-list"
        >

          <div className="wrap">

            <p className="kicker gold-text centered">
              OUR SERVICES
            </p>

            <h2 className="serif centered">
              What we do
            </h2>

            <div className="services-directory-grid">

              {services.map((service) => (

                
              <a
                key={service.path}
                href={service.path}
                className="service-directory-card"
              >

                  <div className="service-directory-image">

                    <img
                      src={service.image}
                      alt={service.title}
                    />

                  </div>

                  <div className="service-directory-body">

                    <h3>
                      {service.title}
                    </h3>

                    <p>
                      {service.text}
                    </p>

                    <span>
                      Explore service →
                    </span>

                  </div>

                </a>

              ))}

            </div>

          </div>

        </section>

        {/* CTA */}
        <section className="services-cta">

          <div className="wrap services-cta-inner">

            <div>

              <p className="kicker gold-text">
                LET'S TALK
              </p>

              <h2 className="serif">
                Not sure which service
                is right for you?
              </h2>

              <p>
                Tell us what you are looking to achieve
                and our team will help you identify the
                right next step.
              </p>

              
                href="/#enquire"
                className="button-gold"
<a
  href="/#enquire"
  className="button-gold"
>
  Speak with Golden Key
</a>

            </div>

            <img
              src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=88"
              alt="Golden Key consultation"
            />

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}
function ServicesTeaser() {
  const services = [
    {
      number: "01",
      title: "Buying",
      text: "A thoughtful search process, from your first brief to the moment you receive the keys.",
      image: IMG[0],
      link: "/buy",
    },
    {
      number: "02",
      title: "Selling",
      text: "Strategic positioning, presentation and market exposure designed to achieve the right result.",
      image: IMG[1],
      link: "/services",
    },
    {
      number: "03",
      title: "Renting",
      text: "Straightforward guidance for finding the right home, in the right location, at the right time.",
      image: IMG[2],
      link: "/rent",
    },
    {
      number: "04",
      title: "Property Care",
      text: "Professional management for owners who want their property protected and performing.",
      image: IMG[3],
      link: "/services/property-management",
    },
  ];

  return (
    <section className="services-showcase">

      <div className="services-showcase-bg" />

      <div className="wrap services-showcase-inner">

        {/* HEADER */}
        <div className="services-showcase-header">

          <div>
            <p className="services-showcase-eyebrow">
              SERVICES THAT MOVE YOU FURTHER
            </p>

            <h2>
              Everything you need,
              <br />
              <em>under one roof.</em>
            </h2>
          </div>

          <div className="services-showcase-intro">
            <span className="services-showcase-line" />

            <p>
              Professional property services built around
              the full journey — from your first decision
              to long-term ownership.
            </p>
          </div>

        </div>

        {/* CARDS */}
        <div className="services-showcase-grid">

          {services.map((service, index) => (

            <motion.a
              key={service.number}
              href={service.link}
              className={`service-showcase-card card-${index + 1}`}
              initial={{
                opacity: 0,
                y: 50,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                margin: "-80px",
              }}
              transition={{
                duration: .7,
                delay: index * .12,
                ease: [0.16, 1, 0.3, 1],
              }}
            >

              <div className="service-showcase-image">

                <img
                  src={service.image}
                  alt={service.title}
                />

                <div className="service-showcase-image-shade" />

                <div className="service-showcase-number">
                  {service.number}
                </div>

                <div className="service-showcase-arrow">
                  ↗
                </div>

              </div>

              <div className="service-showcase-content">

                <div className="service-showcase-title-row">

                  <h3>
                    {service.title}
                  </h3>

                  <span className="service-mini-line" />

                </div>

                <p>
                  {service.text}
                </p>

                <span className="service-showcase-link">
                  Explore service
                  <span>→</span>
                </span>

              </div>

            </motion.a>

          ))}

        </div>

        {/* BOTTOM STATEMENT */}
        <div className="services-showcase-bottom">

          <div className="services-orb">
            <span>GK</span>
          </div>

          <div>
            <p className="services-showcase-eyebrow">
              THE GOLDEN KEY APPROACH
            </p>

            <h3>
              More than a service.
              <br />
              <span>A complete property relationship.</span>
            </h3>
          </div>

          <a href="/services">
            View all services →
          </a>

        </div>

      </div>

    </section>
  );
}

function PropertyManagement() {
  const testimonials = [
    {
      text: "Golden Key gives us the confidence that our property is being looked after properly, with clear communication throughout.",
      name: "Private Property Owner",
    },
    {
      text: "The team handles the day-to-day details professionally and keeps us informed without unnecessary back and forth.",
      name: "Dubai Investor",
    },
    {
      text: "A much easier ownership experience. We know our property is monitored and managed with care.",
      name: "International Client",
    },
  ];

  return (
    <>
      <Header />

      <main className="pm-page">

        {/* HERO */}
        <section className="pm-hero">
          <div className="pm-hero-bg" />
          <div className="pm-hero-overlay" />

          <div className="wrap pm-hero-content reveal">
            <p className="pm-eyebrow">
              PROPERTY MANAGEMENT
            </p>

            <h1>
              Your property cared for,
              like it’s our own
            </h1>

            <p>
              Professional property management designed to
              protect your investment, simplify ownership and
              give you confidence that every important detail
              is being handled.
            </p>

            <div className="pm-hero-actions">
              <a
                href="#pm-contact"
                className="pm-gold-button"
              >
                Enquire
              </a>

              <a
                href="#pm-overview"
                className="pm-outline-button"
              >
                Discover our service
              </a>
            </div>
          </div>
        </section>

        {/* CATEGORY STRIP */}
        <section className="pm-service-strip">
          <div className="wrap">
            <span>Property Management</span>
            <span>Owners</span>
            <span>Landlords</span>
            <span>Investors</span>
            <span>Dubai</span>
          </div>
        </section>

        {/* INTRO + FORM */}
        <section
          className="section pm-intro"
          id="pm-overview"
        >
          <div className="wrap pm-intro-grid">

            <div className="pm-copy reveal">

              <p className="pm-gold-label">
                PROPERTY MANAGEMENT
              </p>

              <h2 className="pm-serif">
                We make your
                <br />
                ownership journey simpler
              </h2>

              <p>
                Managing a property requires more than
                collecting rent and responding to requests.
                It requires attention, organisation and a clear
                understanding of what keeps an investment
                performing.
              </p>

              <p>
                Golden Key provides a structured property
                management service designed around the
                individual needs of owners and investors.
              </p>

              <p>
                From tenant communication and maintenance
                coordination to inspections, reporting and
                ongoing property care, our team handles the
                details so you can focus on the bigger picture.
              </p>

              <h3>
                A professional team behind your property
              </h3>

              <p>
                We believe good management should feel
                proactive rather than reactive. Our approach
                is built around communication, accountability
                and consistency.
              </p>

            </div>

            <div className="pm-form-card reveal">

              <p className="pm-form-label">
                GET IN TOUCH
              </p>

              <h3>
                Speak with our property
                management team
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(
                    "Thank you. Your enquiry has been received."
                  );
                }}
              >

                <input
                  required
                  placeholder="First Name"
                />

                <input
                  required
                  placeholder="Last Name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email Address"
                />

                <input
                  required
                  placeholder="Phone Number"
                />

                <select defaultValue="">
                  <option value="" disabled>
                    Property type
                  </option>
                  <option>Apartment</option>
                  <option>Villa</option>
                  <option>Townhouse</option>
                  <option>Penthouse</option>
                </select>

                <textarea
                  rows="5"
                  placeholder="Tell us about your property"
                />

                <button
                  type="submit"
                  className="pm-gold-button"
                >
                  Send enquiry
                </button>

              </form>

            </div>

          </div>
        </section>

        {/* STATISTICS CARD */}
        <section className="section pm-report-section">

          <div className="wrap">

            <div className="pm-report-card reveal">

              <div className="pm-report-content">

                <p className="pm-gold-label">
                  AT A GLANCE
                </p>

                <h2 className="pm-serif">
                  Professional management
                  <br />
                  built around your asset
                </h2>

                <div className="pm-stats">

                  <div>
                    <strong>24/7</strong>
                    <span>support availability</span>
                  </div>

                  <div>
                    <strong>360°</strong>
                    <span>property oversight</span>
                  </div>

                  <div>
                    <strong>100%</strong>
                    <span>owner visibility</span>
                  </div>

                </div>

                <p>
                  A structured service that combines
                  proactive communication, tenant support,
                  maintenance coordination and regular
                  property oversight.
                </p>

                <a
                  href="#pm-contact"
                  className="pm-gold-button"
                >
                  Discover our approach
                </a>

              </div>

              <div className="pm-report-visual">
                <div className="pm-report-paper">
                  PROPERTY
                  <br />
                  MANAGEMENT
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* TEXT + CENTER MARKER */}
        <section className="section pm-explanation">

          <div className="wrap pm-explanation-grid">

            <div className="reveal">

              <p className="pm-gold-label">
                WHY MANAGEMENT MATTERS
              </p>

              <h2 className="pm-serif">
                Your investment deserves
                <br />
                consistent attention
              </h2>

              <p>
                Property ownership can become time-consuming
                when every maintenance issue, tenant request,
                inspection and operational detail comes back
                to you.
              </p>

              <p>
                A strong management structure creates space
                for owners to step back while still knowing
                exactly what is happening with their asset.
              </p>

              <a href="#pm-contact" className="pm-text-link">
                Talk to our team →
              </a>

            </div>

            <div className="pm-center-mark">
              <span>◆</span>
            </div>

          </div>

        </section>

        {/* WHITE REPORT / PASSPORT CARD */}
        <section className="section pm-feature-section">

          <div className="wrap">

            <div className="pm-feature-card reveal">

              <div>

                <p className="pm-gold-label">
                  OWNER EXPERIENCE
                </p>

                <h2 className="pm-serif">
                  Everything your property
                  <br />
                  needs, brought together
                </h2>

                <p>
                  From tenant onboarding to inspections,
                  maintenance and reporting, our team
                  coordinates the moving parts so you
                  don't have to.
                </p>

                <div className="pm-pills">
                  <span>Tenant support</span>
                  <span>Maintenance</span>
                  <span>Inspections</span>
                  <span>Reporting</span>
                </div>

              </div>

              <div className="pm-paper-stack">
                <div className="pm-paper pm-paper-back" />
                <div className="pm-paper pm-paper-front">
                  GOLDEN
                  <br />
                  KEY
                  <br />
                  OWNER
                  <br />
                  REPORT
                </div>
              </div>

            </div>

          </div>

        </section>

        {/* ALTERNATING CONTENT */}
        <section className="section pm-alternating">

          <div className="wrap">

            <div className="pm-alternate-row reveal">

              <div>
                <p className="pm-gold-label">
                  TENANT EXPERIENCE
                </p>

                <h2 className="pm-serif">
                  The right support,
                  <br />
                  when it matters
                </h2>

                <p>
                  Fast communication and clear processes
                  can make a major difference to tenant
                  satisfaction and long-term property
                  performance.
                </p>

                <p>
                  Our team coordinates communication,
                  requests and practical property needs
                  with a focus on professionalism.
                </p>
              </div>

<div className="pm-real-image pm-image-reveal">
  <img
    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=90"
    alt="Luxury property interior"
  />

  <div className="pm-image-overlay">
    <span>Tenant experience</span>
  </div>
</div>

            </div>

            <div className="pm-alternate-row reverse reveal">

              <div>
                <p className="pm-gold-label">
                  PROPERTY CARE
                </p>

                <h2 className="pm-serif">
                  Your asset maintained
                  <br />
                  with purpose
                </h2>

                <p>
                  Regular attention helps identify issues
                  early and protects the condition and
                  long-term value of your property.
                </p>

                <ul>
                  <li>Routine property inspections</li>
                  <li>Maintenance coordination</li>
                  <li>Issue tracking</li>
                  <li>Owner communication</li>
                </ul>

                <a
                  href="#pm-contact"
                  className="pm-outline-small"
                >
                  Learn more
                </a>

              </div>

<div className="pm-real-image pm-image-reveal">
  <img
    src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=90"
    alt="Professionally maintained property"
  />

  <div className="pm-image-overlay">
    <span>Property care</span>
  </div>
</div>

            </div>

          </div>

        </section>

        {/* TESTIMONIALS */}
        <section className="section pm-testimonials">

          <div className="wrap">

            <p className="pm-gold-label centered">
              OWNER FEEDBACK
            </p>

            <h2 className="pm-serif centered">
              Hear from owners who have lived
              <br />
              the difference
            </h2>

            <p className="pm-testimonial-intro">
              Good management should make ownership
              feel easier, clearer and more predictable.
            </p>

            <div className="pm-testimonial-grid">

              {testimonials.map((item) => (

                <article
                  className="pm-testimonial"
                  key={item.name}
                >

                  <p>
                    “{item.text}”
                  </p>

                  <strong>
                    {item.name}
                  </strong>

                </article>

              ))}

            </div>

          </div>

        </section>

        {/* DASHBOARD */}
        <section className="section pm-dashboard-section">

          <div className="wrap pm-dashboard-grid">

            <div className="pm-dashboard-image reveal">

              <div className="pm-monitor">

                <div className="pm-monitor-top">
                  Golden Key
                </div>

                <div className="pm-monitor-body">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>

              </div>

            </div>

            <div className="reveal">

              <p className="pm-gold-label">
                MANAGEMENT VISIBILITY
              </p>

              <h2 className="pm-serif">
                Keeping you informed
                <br />
                throughout the journey
              </h2>

              <p>
                Owners should never feel disconnected from
                their investment. Our reporting and
                communication approach is designed to keep
                the important information visible.
              </p>

              <a
                href="#pm-contact"
                className="pm-outline-small"
              >
                Discover our approach
              </a>

            </div>

          </div>

        </section>

        {/* FINAL CTA */}
        <section
          className="pm-final-cta"
          id="pm-contact"
        >

          <div className="wrap">

            <p className="pm-gold-label">
              PROPERTY MANAGEMENT
            </p>

            <h2>
              Managing your property
              <br />
              should be simple,
              <br />
              we make sure it is.
            </h2>

            <p>
              Speak with Golden Key about a management
              approach tailored to your property.
            </p>

            <a
              href="#pm-top"
              className="pm-gold-button"
            >
              Speak with us
            </a>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

function DevelopmentSalesConsultancy() {
  return (
    <>
      <Header />

      <main className="dsc-page">

        {/* HERO */}
        <section className="dsc-hero">
          <div className="dsc-hero-bg" />
          <div className="dsc-hero-overlay" />

          <div className="wrap dsc-hero-content">
            <p className="dsc-eyebrow">
              DEVELOPMENT SALES & CONSULTANCY
            </p>

            <h1>
              Everything you need,
              <br />
              from concept to
              <br />
              completion
            </h1>

            <a
              href="#dsc-contact"
              className="dsc-coral-button"
            >
              Enquire now
            </a>
          </div>
        </section>

        {/* SECTION NAV */}
        <section className="dsc-section-nav">
          <div className="wrap">
            <a href="#partner">01<br />Why partner with us</a>
            <a href="#belief">02<br />What we believe</a>
            <a href="#choose">03<br />Why choose Golden Key</a>
            <a href="#network">04<br />Our network</a>
            <a href="#brand">05<br />Branded residences</a>
            <a href="#solutions">06<br />Solutions you can trust</a>
          </div>
        </section>

        {/* WHY PARTNER */}
        <section
          className="section dsc-section"
          id="partner"
        >
          <div className="wrap dsc-two-col">

            <div className="dsc-copy reveal">
              <p className="dsc-label">
                Why partner with us
              </p>

              <h2 className="dsc-serif">
                Every project begins with a vision,
                <br />
                and we transform it into reality.
              </h2>

              <p>
                We help developers define, shape, launch
                and bring their projects to the market.
                Golden Key combines local market knowledge,
                commercial thinking and specialist delivery
                to create a clear route from idea to execution.
              </p>

              <p>
                Every development deserves its own strategy.
                We build an approach around the project's
                positioning, audience, timeline and ambitions,
                then support the journey across consultancy,
                sales, marketing and completion.
              </p>

              <a
                href="#dsc-contact"
                className="dsc-outline-button"
              >
                Get in touch
              </a>
            </div>

            <div className="dsc-image-wrap reveal">
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=90"
                alt="Dubai development"
              />
            </div>

          </div>
        </section>

        {/* WHAT WE BELIEVE */}
        <section
          className="section dsc-belief"
          id="belief"
        >
          <div className="wrap dsc-belief-grid">

            <div className="dsc-belief-image reveal">
              <img
                src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=88"
                alt="Golden Key consultation"
              />

              <div className="dsc-image-caption">
                <span>What we believe</span>
                <strong>Golden Key Real Estate</strong>
              </div>
            </div>

            <div className="dsc-copy reveal">

              <p className="dsc-label">
                What we believe
              </p>

              <h2 className="dsc-serif">
                Real estate is about people
              </h2>

              <p>
                Behind every development are real people,
                real goals and significant decisions.
                Our role is to understand the commercial
                opportunity while never losing sight of
                the people who will ultimately experience
                the project.
              </p>

              <p>
                We believe strong partnerships are built
                through transparency, communication,
                market intelligence and accountability.
                That philosophy shapes how we work with
                developers at every stage.
              </p>

              <a
                href="#dsc-contact"
                className="dsc-outline-button"
              >
                Get in touch
              </a>

            </div>

          </div>
        </section>

        {/* WHY CHOOSE + FORM */}
        <section
          className="section dsc-choose"
          id="choose"
        >
          <div className="wrap dsc-choose-grid">

            <div className="dsc-copy">

              <p className="dsc-label">
                Get started
              </p>

              <h2 className="dsc-serif">
                Why choose Golden Key
              </h2>

              <div className="dsc-benefits">

                <div>
                  <h3>
                    Market-leading consultants
                  </h3>

                  <p>
                    Bring your project to market with
                    a team that understands positioning,
                    buyer demand and commercial strategy.
                  </p>
                </div>

                <div>
                  <h3>
                    Local knowledge
                  </h3>

                  <p>
                    Dubai requires local context.
                    Our approach is shaped around the
                    market, its communities and the
                    people operating within it.
                  </p>
                </div>

                <div>
                  <h3>
                    Packages to suit you
                  </h3>

                  <p>
                    Every project has different objectives,
                    budgets and timelines. We shape the
                    service around the requirements of
                    your development.
                  </p>
                </div>

                <div>
                  <h3>
                    Dedicated team
                  </h3>

                  <p>
                    You have clear points of contact
                    across the sales and marketing
                    journey so you always know what
                    happens next.
                  </p>
                </div>

                <div>
                  <h3>
                    360° marketing
                  </h3>

                  <p>
                    From campaign strategy and creative
                    direction to launch activity and
                    reporting, we keep every channel
                    working toward the same goal.
                  </p>
                </div>

              </div>

            </div>

            <div
              className="dsc-form-card"
              id="dsc-contact"
            >

              <h3>
                Schedule a call to discuss
                how we can be involved in
                your project.
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  alert(
                    "Thank you. Your enquiry has been received."
                  );
                }}
              >

                <input
                  required
                  placeholder="First name"
                />

                <input
                  required
                  placeholder="Last name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email address"
                />

                <select defaultValue="">
                  <option value="" disabled>
                    I am interested in...
                  </option>

                  <option>
                    Development sales
                  </option>

                  <option>
                    Consultancy
                  </option>

                  <option>
                    Project marketing
                  </option>

                  <option>
                    Branded residences
                  </option>
                </select>

                <input
                  placeholder="Company"
                />

                <input
                  placeholder="Phone number"
                />

                <textarea
                  rows="5"
                  placeholder="Tell us about your project"
                />

                <button
                  type="submit"
                  className="dsc-coral-button"
                >
                  Submit
                </button>

              </form>

            </div>

          </div>
        </section>

        {/* NETWORK */}
        <section
          className="section dsc-network"
          id="network"
        >
          <div className="wrap">

            <div className="dsc-network-copy">
              <p className="dsc-label">
                Your network as our partner
              </p>

              <h2 className="dsc-serif">
                Your project plugged into
                <br />
                a powerful broker network
              </h2>

              <p>
                A successful development needs visibility
                beyond a single sales channel. Golden Key
                builds relationships across the UAE market
                so your project can reach more qualified
                buyers, investors and broker partners.
              </p>

              <a
                href="#dsc-contact"
                className="dsc-outline-button"
              >
                Get in touch
              </a>
            </div>

            <div className="dsc-network-stats">

              <div className="dsc-stat-diamond">
                <strong>70</strong>
                <span>Countries</span>
              </div>

              <div className="dsc-stat-diamond">
                <strong>550</strong>
                <span>Companies</span>
              </div>

              <div className="dsc-stat-diamond">
                <strong>4.8k</strong>
                <span>Offices</span>
              </div>

              <div className="dsc-stat-diamond">
                <strong>13.4k</strong>
                <span>Associates</span>
              </div>

              <div className="dsc-globe">
                <div className="globe-ring ring-1" />
                <div className="globe-ring ring-2" />
                <div className="globe-ring ring-3" />
                <div className="globe-line line-1" />
                <div className="globe-line line-2" />
                <div className="globe-line line-3" />
              </div>

            </div>

          </div>
        </section>

        {/* STATS */}
        <section className="dsc-small-stats">
          <div className="wrap">
            <div>
              <strong>84 countries</strong>
              <span>Introductions made worldwide</span>
            </div>

            <div>
              <strong>400+ clients</strong>
              <span>Introductions made weekly</span>
            </div>

            <div>
              <strong>19,000 clients</strong>
              <span>Introductions made each year</span>
            </div>
          </div>
        </section>

        {/* SYNDICATION */}
        <section className="dsc-syndication">
          

          <div className="wrap">

            <p className="dsc-label centered">
              Syndication partners
            </p>

            <div className="dsc-partners">

              <span>◆</span>
              <span>◆</span>
              <span>◆</span>
              <span>◆</span>
              <span>◆</span>

            </div>

          </div>

        </section>

        {/* GLOBAL REACH */}
        <section className="section dsc-global">

          <div className="wrap dsc-global-grid">

            <div />

            <div className="dsc-copy">

              <p className="dsc-label">
                Branded residences
              </p>

              <h2 className="dsc-serif">
                Your project value increases
                <br />
                with the right brand partner
              </h2>

              <p>
                The right brand can transform a development's
                positioning. We help identify suitable partners
                across hospitality, design, automotive, fashion
                and lifestyle, then support the process through
                structured recommendations and negotiation.
              </p>

              <a
                href="#dsc-contact"
                className="dsc-outline-button"
              >
                Get in touch
              </a>

            </div>

          </div>

        </section>

        {/* COMPLETE DEVELOPMENT SOLUTIONS */}
        <section
          className="section dsc-solutions"
          id="solutions"
        >

          <div className="wrap">

            <h2 className="dsc-solutions-title">
              Your partner for complete
              <br />
              development solutions
            </h2>

            <div className="dsc-solution-content">

              <div className="dsc-solution-image">
                <img
                  src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1400&q=88"
                  alt="Development team"
                />
              </div>

              <div className="dsc-solution-tabs">

                <div className="dsc-tabs">
                  <button className="active">
                    01
                  </button>

                  <button>
                    02
                  </button>

                  <button>
                    03
                  </button>
                </div>

                <h3>
                  Complete
                </h3>

                <p>
                  A complete development route combining
                  commercial planning, sales, marketing and
                  operational support.
                </p>

                <ul>
                  <li>Market research</li>
                  <li>Investor introductions</li>
                  <li>Feasibility studies</li>
                  <li>Consultant recommendations</li>
                  <li>DLD and regulatory support</li>
                  <li>Sales and marketing planning</li>
                  <li>Management and operations</li>
                </ul>

              </div>

            </div>

            <div className="dsc-location-label">
              Our office locations
            </div>

          </div>

        </section>

        {/* FINAL CTA */}
        <section className="dsc-final-cta">

          <div className="wrap">

            <h2>
              From blueprint to buyer,
              <br />
              we help developers turn
              <br />
              ideas into results.
            </h2>

            <p>
              With market-backed strategy and on-ground
              expertise, Golden Key helps position projects
              to sell and stand out.
            </p>

            <a
              href="#dsc-contact"
              className="dsc-coral-button"
            >
              Enquire now
            </a>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}


function PropertyValuation() {
  // --- STATE FOR PROCESS STEPS SLIDER ---
  const [activeStep, setActiveStep] = useState(0);

  // --- STATE FOR "WHAT SETS US APART" CAROUSEL ---
  const [activeApartIndex, setActiveApartIndex] = useState(3); // Default to item 04 (100,000+ qualified clients)

  // --- PROCESS STEPS DATA ---
  const processSteps = [
    {
      number: "01",
      title: "Your details",
      description: "Enter your property location and key details",
      ctaText: "How much is my property worth?",
    },
    {
      number: "02",
      title: "An expert consultation",
      description:
        "Get your personalised review with a Golden Key property specialist.",
      ctaText: "How much is my property worth?",
    },
    {
      number: "03",
      title: "Valuation report",
      description: "Receive your detailed valuation report",
      ctaText: "How much is my property worth?",
    },
  ];

  // --- WHAT SETS US APART DATA ---
  const apartItems = [
    {
      number: "01",
      stat: "40 years",
      label: "of market intelligence",
      description:
        "Trusted experience delivering clarity and strategic direction across the property market since 1986.",
      footerNote:
        "Together, this allows us to deliver valuations that reflect real demand, real buyers and real outcomes.",
    },
    {
      number: "02",
      stat: "250,000+",
      label: "homes sold",
      description:
        "The most comprehensive record of market transactions and real sales insight.",
      footerNote:
        "Together, this allows us to deliver valuations that reflect real demand, real buyers and real outcomes.",
    },
    {
      number: "03",
      stat: "Every 12 mins",
      label: "a transaction is completed",
      description:
        "Our high transaction frequency gives us a live, real-time view of pricing, buyer behaviour, and current demand.",
      footerNote:
        "Together, this allows us to deliver valuations that reflect real demand, real buyers and real outcomes.",
    },
    {
      number: "04",
      stat: "100,000+",
      label: "qualified clients",
      description:
        "An active database of pre-qualified buyers, investors, tenants, and corporate decision-makers actively searching.",
      footerNote:
        "Together, this helps us provide valuations that reflect current demand, real buyer behaviour and the conditions shaping the market today.",
    },
    {
      number: "05",
      stat: "300+",
      label: "specialists guiding you",
      description:
        "Local Golden Key experts who deeply understand neighbourhood-level pricing, trends, and buyer intent.",
      footerNote:
        "Together, this allows us to deliver valuations that reflect real demand, real buyers and real outcomes.",
    },
    {
      number: "06",
      stat: "2,500+",
      label: "five-star reviews",
      description:
        "Independent feedback from homeowners and property investors who trust Golden Key for their guidance.",
      footerNote:
        "Together, this allows us to deliver valuations that reflect real demand, real buyers and real outcomes.",
    },
  ];

  // --- FAQS DATA ---
  const faqs = [
    {
      question: "Why do I need a property valuation?",
      answer:
        "A professional valuation gives you a clearer understanding of where your property sits in the current market. It can support decisions around selling, refinancing, investment planning and long-term ownership.",
    },
    {
      question: "Why choose Golden Key?",
      answer:
        "Our approach combines local market knowledge, comparable evidence and a practical understanding of current buyer and investor demand.",
    },
    {
      question: "How accurate is the valuation?",
      answer:
        "A valuation is based on the available market evidence, the specific characteristics of the property and current market conditions.",
    },
    {
      question: "What happens after I submit my details?",
      answer:
        "A member of the Golden Key team will review your information and contact you to arrange the next step.",
    },
  ];

  // --- HANDLERS FOR PROCESS SLIDER ---
  const handlePrevStep = () => {
    setActiveStep((prev) => (prev > 0 ? prev - 1 : processSteps.length - 1));
  };

  const handleNextStep = () => {
    setActiveStep((prev) => (prev < processSteps.length - 1 ? prev + 1 : 0));
  };

  const currentStep = processSteps[activeStep];
  const currentApart = apartItems[activeApartIndex];

  return (
    <>
      <Header />

      <main className="valuation-page">
        {/* HERO */}
        <section className="valuation-hero">
          <div className="valuation-hero-bg" />
          <div className="valuation-hero-overlay" />

          <div className="wrap valuation-hero-content">
            <p className="valuation-eyebrow">
              GOLDEN KEY PROPERTY VALUATION
            </p>

            <h1>
              Know what your
              <br />
              property is truly worth
            </h1>

            <p>
              We combine local market knowledge, buyer behaviour,
              comparable evidence and current demand to give you
              a clearer understanding of your property's value.
            </p>

            <a
              href="#valuation-form"
              className="valuation-coral-button"
            >
              Get your free valuation
            </a>
          </div>
        </section>

        {/* HOW IT WORKS (DYNAMIC SLIDER) */}
        <section className="valuation-process section">
          <div className="wrap">
            <h2 className="valuation-serif centered">
              How your free property valuation works
            </h2>

            <div className="valuation-timeline">
              <button
                className="valuation-arrow"
                type="button"
                onClick={handlePrevStep}
                aria-label="Previous step"
              >
                ‹
              </button>

              <div className="valuation-line">
                {processSteps.map((_, index) => (
                  <span
                    key={index}
                    className={`timeline-dot ${
                      index === activeStep ? "active" : ""
                    }`}
                    onClick={() => setActiveStep(index)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </div>

              <button
                className="valuation-arrow"
                type="button"
                onClick={handleNextStep}
                aria-label="Next step"
              >
                ›
              </button>
            </div>

            <div key={activeStep} className="valuation-process-step">
              <span className="process-number">
                {currentStep.number}
              </span>

              <h3>{currentStep.title}</h3>

              <p>{currentStep.description}</p>

              <a
                href="#valuation-form"
                className="valuation-coral-button"
              >
                {currentStep.ctaText}
              </a>
            </div>
          </div>
        </section>

        {/* WHAT SETS US APART (DYNAMIC CAROUSEL) */}
        <section className="valuation-apart">
          <div className="wrap">
            <h2 className="valuation-serif centered">
              What sets us apart
            </h2>

            <div className="valuation-circle" key={activeApartIndex}>
              <span className="circle-mark">
                {currentApart.number}
              </span>

              <div className="circle-content">
                <strong>{currentApart.stat}</strong>
                <span>{currentApart.label}</span>

                <p>{currentApart.description}</p>

                {/* CLICKABLE DIAMONDS NAVIGATION */}
                <div className="circle-stars" style={{ userSelect: "none" }}>
                  {apartItems.map((_, index) => (
                    <span
                      key={index}
                      onClick={() => setActiveApartIndex(index)}
                      style={{
                        cursor: "pointer",
                        padding: "0 6px",
                        fontSize: "18px",
                        transition: "transform 0.2s ease",
                      }}
                      title={`View stat ${index + 1}`}
                    >
                      {index === activeApartIndex ? "◆" : "◇"}
                    </span>
                  ))}
                </div>

                <p>{currentApart.footerNote}</p>

                <a
                  href="#valuation-form"
                  className="valuation-coral-button"
                >
                  How much is my property worth?
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* TIMING */}
        <section className="valuation-timing">
          <div className="valuation-timing-bg" />
          <div className="valuation-timing-overlay" />

          <div className="wrap valuation-timing-content">
            <h2 className="valuation-serif light">
              Timing matters because markets move
            </h2>

            <p>
              Property decisions are rarely just about price.
              They are about timing, market value and knowing
              what your property can achieve today.
            </p>

            <div className="timing-diamonds">
              <div className="timing-diamond">
                <strong>01</strong>
                <h3>Better decisions</h3>
                <p>
                  Understand your property's current market
                  position and decide whether to sell,
                  refinance or hold.
                </p>
              </div>

              <div className="timing-diamond">
                <strong>02</strong>
                <h3>Buyer demand</h3>
                <p>
                  Buyer activity, rental demand and
                  community momentum can significantly
                  influence how your property performs.
                </p>
              </div>

              <div className="timing-diamond">
                <strong>03</strong>
                <h3>Market conditions</h3>
                <p>
                  Supply, mortgage conditions and buyer
                  behaviour all influence value and the
                  opportunities available to owners.
                </p>
              </div>
            </div>

            <a
              href="#valuation-form"
              className="valuation-coral-button"
            >
              How much is my property worth?
            </a>
          </div>
        </section>

        {/* REVIEWS + FAQ */}
        <section className="valuation-faq-section section">
          <div className="wrap valuation-faq-grid">
            <div>
              <h2 className="valuation-serif">Customer reviews</h2>

              <div className="valuation-reviews">
                <article>
                  <div className="review-stars">★★★★★</div>
                  <p>
                    “The team helped us understand where our property sat in the
                    market and gave us a clear plan for the next step.”
                  </p>
                  <strong>Private client</strong>
                </article>

                <article>
                  <div className="review-stars">★★★★★</div>
                  <p>
                    “Professional, responsive and very clear about the factors
                    influencing the valuation.”
                  </p>
                  <strong>Property owner</strong>
                </article>

                <article>
                  <div className="review-stars">★★★★★</div>
                  <p>
                    “The process was straightforward and the market explanation
                    was extremely useful.”
                  </p>
                  <strong>Investor</strong>
                </article>
              </div>
            </div>

            <div>
              <h2 className="valuation-serif">
                Your key questions answered
              </h2>

              <div className="valuation-faq">
                {faqs.map((faq, index) => (
                  <details key={faq.question} open={index === 0}>
                    <summary>
                      {faq.question}
                      <span>⌃</span>
                    </summary>

                    <div>
                      <p>{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FORM CTA */}
        <section className="valuation-final" id="valuation-form">
          <div className="wrap">
            <h2>
              Ready to discover your
              <br />
              property's true value?
            </h2>

            <p>Request your free Golden Key property valuation.</p>

            <form
              className="valuation-final-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  "Thank you. Your valuation request has been received."
                );
              }}
            >
              <div className="valuation-form-row">
                <input required placeholder="First name" />
                <input required placeholder="Last name" />
              </div>

              <div className="valuation-form-row">
                <input required type="email" placeholder="Email address" />
                <input required placeholder="Phone number" />
              </div>

              <input placeholder="Property location" />

              <button type="submit" className="valuation-coral-button">
                Start your valuation
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function EnquirePage() {
  return (
    <>
      <Header />

      <main className="enquire-page">

        {/* INTRO */}
        <section className="enquire-intro">

          <div className="wrap enquire-intro-grid">

            <div className="enquire-intro-copy">

              <p className="enquire-label">
                GET IN TOUCH
              </p>

              <h1>
                Begin Your
                <br />
                Journey
              </h1>

              <p>
                Tell us what you are looking for,
                and our team will help you find the
                right next step.
              </p>

              <div className="enquire-details">

                <a href="tel:+971000000000">
                  ☎ +971 00 000 0000
                </a>

                <a href="mailto:info@goldenkey.ae">
                  ✉ info@goldenkey.ae
                </a>

                <span>
                  ⌖ Dubai, United Arab Emirates
                </span>

              </div>

              <a
                href="https://wa.me/"
                className="whatsapp-button"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp Us
              </a>

            </div>

            <div className="enquire-page-form">

              <p className="enquire-form-eyebrow">
                CONTACT GOLDEN KEY
              </p>

              <h2>
                How can we help?
              </h2>

              <EnquiryForm />

            </div>

          </div>

        </section>

        {/* MAP */}
        <section className="enquire-map">

          <iframe
            title="Golden Key Dubai location"
            src="https://www.google.com/maps?q=Dubai,UAE&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />

        </section>

      </main>

      <Footer />
    </>
  );
}

function AreaGuides() {
  const [guides, setGuides] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const refresh = () => {
      loadAreaGuides().then(setGuides);
    };

    refresh();

    window.addEventListener(
      "area-guides-updated",
      refresh
    );

    window.addEventListener(
      "storage",
      refresh
    );

    return () => {
      window.removeEventListener(
        "area-guides-updated",
        refresh
      );

      window.removeEventListener(
        "storage",
        refresh
      );
    };
  }, []);

  const visibleGuides = guides.filter((guide) => {
    if (
      String(guide.status || "")
        .toLowerCase() !== "published"
    ) {
      return false;
    }

    const text = `
      ${guide.title || ""}
      ${guide.location || ""}
      ${guide.excerpt || ""}
    `.toLowerCase();

    return text.includes(
      search.toLowerCase()
    );
  });

  return (
    <>
      <Header />

      <main className="area-guides-page">

        <section className="area-guides-heading">

          <div className="wrap">

            <p className="area-guides-kicker">
              GOLDEN KEY GUIDES
            </p>

            <h1>
              Explore the best communities
              <br />
              to live in Dubai
            </h1>

            <p>
              Everything you need to know about Dubai's
              communities, neighbourhoods and the places
              that make each area unique.
            </p>

            <div className="area-guides-search">

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search an area or community..."
              />

            </div>

          </div>

        </section>

        <section className="area-guides-grid-section">

          <div className="wrap">

            {visibleGuides.length > 0 ? (

              <div className="area-guides-grid">

                {visibleGuides.map((guide) => (

                  <a
                    key={guide.id}
                    href={`/guides/area-guides/${guide.slug}`}
                    className="area-guide-card"
                  >

                    <div className="area-guide-card-image">

                      <img
                        src={guide.heroImage}
                        alt={guide.title}
                      />

                      <span className="read-badge">
                        {guide.readTime || "5 min read"}
                      </span>

                    </div>

                    <div className="area-guide-card-body">

                      <p className="area-guide-location">
                        {guide.location}
                      </p>

                      <h2>
                        {guide.title}
                      </h2>

                      <p>
                        {guide.excerpt}
                      </p>

                      <span className="read-guide">
                        Read Guide →
                      </span>

                    </div>

                  </a>

                ))}

              </div>

            ) : (

              <div className="area-guides-empty">

                <h2>
                  No area guides found
                </h2>

                <p>
                  Published area guides will appear here.
                </p>

              </div>

            )}

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

function AreaGuideDetail({ slug }) {
  const [guides, setGuides] = useState([]);

  useEffect(() => {
    const refresh = () => {
      loadAreaGuides().then(setGuides);
    };

    refresh();

    window.addEventListener(
      "area-guides-updated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "area-guides-updated",
        refresh
      );
    };
  }, []);

  const guide = guides.find(
    (item) => item.slug === slug
  );

  if (!guide) {
    return (
      <>
        <Header />

        <main className="page-placeholder">
          <div className="wrap">

            <h1 className="serif">
              Area guide not found
            </h1>

            <a
              href="/guides/area-guides"
              className="button-outline"
            >
              ← Back to Area Guides
            </a>

          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="area-guide-detail">

        {/* HERO */}

        <section className="area-detail-hero">

          <img
            src={guide.heroImage}
            alt={guide.title}
          />

          <div className="area-detail-hero-overlay" />

          <div className="wrap">

            <p>
              GOLDEN KEY AREA GUIDE
            </p>

            <h1>
              {guide.title}
            </h1>

            <span>
              {guide.location}
            </span>

          </div>

        </section>

        {/* BODY */}

        <section className="area-detail-section">

          <div className="wrap area-detail-layout">

            <article className="area-detail-content">

              <p className="area-detail-breadcrumb">
                Guides / Area Guides / {guide.title}
              </p>

              <h2>
                Everything you need to know
                about {guide.location}
              </h2>

              <p>
                {guide.intro}
              </p>

              <h3>
                About {guide.location}
              </h3>

              <p>
                {guide.about}
              </p>

              {/* MAP */}

              {guide.mapImage && (
                <div className="area-detail-image map-image">

                  <img
                    src={guide.mapImage}
                    alt={`${guide.title} map`}
                  />

                </div>
              )}

              <h3>
                Living in {guide.location}
              </h3>

              <p>
                {guide.living}
              </p>

              {/* IMAGE */}

              {guide.image2 && (
                <div className="area-detail-image">

                  <img
                    src={guide.image2}
                    alt={guide.title}
                  />

                </div>
              )}

              {/* QUICK FACTS */}

              <div className="area-facts">

                <div>
                  <strong>
                    Location
                  </strong>

                  <span>
                    {guide.location}
                  </span>
                </div>

                <div>
                  <strong>
                    Guide time
                  </strong>

                  <span>
                    {guide.readTime || "5 min read"}
                  </span>
                </div>

                <div>
                  <strong>
                    Property
                  </strong>

                  <span>
                    Residential
                  </span>
                </div>

                <div>
                  <strong>
                    Area
                  </strong>

                  <span>
                    Dubai
                  </span>
                </div>

              </div>

              {/* MARKET */}

              <h3>
                Property market
              </h3>

              <p>
                {guide.market}
              </p>

              {guide.image3 && (
                <div className="area-detail-image">

                  <img
                    src={guide.image3}
                    alt={`${guide.title} property market`}
                  />

                </div>
              )}

              {/* SCHOOLS */}

              <h3>
                Schools and education
              </h3>

              <p>
                {guide.schools}
              </p>

              {/* LIFESTYLE */}

              {guide.image4 && (
                <div className="area-detail-image">

                  <img
                    src={guide.image4}
                    alt={`${guide.title} lifestyle`}
                  />

                </div>
              )}

              <h3>
                Lifestyle and things to do
              </h3>

              <p>
                {guide.lifestyle}
              </p>

              {/* TRANSPORT */}

              <h3>
                Getting around
              </h3>

              <p>
                {guide.transport}
              </p>

              {guide.image5 && (
                <div className="area-detail-image">

                  <img
                    src={guide.image5}
                    alt={`${guide.title} attraction`}
                  />

                </div>
              )}

            </article>

            {/* SIDEBAR FORM */}

            <aside className="area-detail-sidebar">

              <div className="area-detail-form">

                <p>
                  FIND YOUR NEXT PROPERTY
                </p>

                <h3>
                  Looking in {guide.location}?
                </h3>

                <EnquiryForm compact />

              </div>

              <div className="area-guide-side-card">

                <strong>
                  Looking to move?
                </strong>

                <span>
                  Browse properties available
                  in Dubai.
                </span>

                <a href="/buy">
                  View properties →
                </a>

              </div>

            </aside>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}


function AreaGuideAdmin({
  guides,
  loaded,
  form,
  updateGuide,
  addAreaGuide,
  removeAreaGuide,
}) {
  return (
    <div className="area-admin">

      <section className="admin-grid">

        <div className="admin-card">

          <div className="card-head">

            <div>
              <h2>
                Add Area Guide
              </h2>

              <p>
                Create a published community guide.
              </p>
            </div>

          </div>

          {!loaded && (
            <p className="admin-note">
              Loading existing area guides…
            </p>
          )}

          <form
            className="admin-form"
            onSubmit={addAreaGuide}
          >

            <input
              required
              value={form.title}
              onChange={(e) =>
                updateGuide({
                  title: e.target.value,
                })
              }
              placeholder="Guide title"
            />

            <input
              value={form.location}
              onChange={(e) =>
                updateGuide({
                  location: e.target.value,
                })
              }
              placeholder="Location"
            />

            <input
              value={form.readTime}
              onChange={(e) =>
                updateGuide({
                  readTime: e.target.value,
                })
              }
              placeholder="Reading time e.g. 5 min read"
            />

            <textarea
              required
              value={form.excerpt}
              onChange={(e) =>
                updateGuide({
                  excerpt: e.target.value,
                })
              }
              placeholder="Short guide description"
              rows="3"
            />

            <div className="image-input-section">

              <div className="image-input-title">
                Guide Images
              </div>

              <input
                required
                value={form.heroImage}
                onChange={(e) =>
                  updateGuide({
                    heroImage: e.target.value,
                  })
                }
                placeholder="Hero image URL"
              />

              <input
                value={form.mapImage}
                onChange={(e) =>
                  updateGuide({
                    mapImage: e.target.value,
                  })
                }
                placeholder="Map image URL"
              />

              {[2, 3, 4, 5].map(
                (number) => (
                  <input
                    key={number}
                    value={
                      form[`image${number}`]
                    }
                    onChange={(e) =>
                      updateGuide({
                        [`image${number}`]:
                          e.target.value,
                      })
                    }
                    placeholder={
                      `Guide image ${number} URL`
                    }
                  />
                )
              )}

            </div>

            <textarea
              value={form.intro}
              onChange={(e) =>
                updateGuide({
                  intro: e.target.value,
                })
              }
              placeholder="Introduction"
              rows="5"
            />

            <textarea
              value={form.about}
              onChange={(e) =>
                updateGuide({
                  about: e.target.value,
                })
              }
              placeholder="About the area"
              rows="5"
            />

            <textarea
              value={form.living}
              onChange={(e) =>
                updateGuide({
                  living: e.target.value,
                })
              }
              placeholder="Living in the area"
              rows="5"
            />

            <textarea
              value={form.market}
              onChange={(e) =>
                updateGuide({
                  market: e.target.value,
                })
              }
              placeholder="Property market"
              rows="5"
            />

            <textarea
              value={form.schools}
              onChange={(e) =>
                updateGuide({
                  schools: e.target.value,
                })
              }
              placeholder="Schools and education"
              rows="4"
            />

            <textarea
              value={form.lifestyle}
              onChange={(e) =>
                updateGuide({
                  lifestyle: e.target.value,
                })
              }
              placeholder="Lifestyle and things to do"
              rows="4"
            />

            <textarea
              value={form.transport}
              onChange={(e) =>
                updateGuide({
                  transport: e.target.value,
                })
              }
              placeholder="Getting around / transport"
              rows="4"
            />

            <select
              value={form.status}
              onChange={(e) =>
                updateGuide({
                  status: e.target.value,
                })
              }
            >
              <option value="published">
                Publish immediately
              </option>

              <option value="draft">
                Save as draft
              </option>
            </select>

            <button
              className="button-coral"
              type="submit"
              disabled={!loaded}
            >
              Add Area Guide
            </button>

          </form>

        </div>

      </section>

      <section className="admin-card">

        <div className="card-head">

          <div>
            <h2>
              Existing Area Guides
            </h2>

            <p>
              {guides.length} guide(s)
            </p>
          </div>

        </div>

        <div className="admin-table-wrap">

          <table>

            <thead>
              <tr>
                <th>Guide</th>
                <th>Location</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {guides.length > 0 ? (

                guides.map((guide) => (

                  <tr key={guide.id}>

                    <td>
                      <strong>
                        {guide.title}
                      </strong>

                      <small>
                        /guides/area-guides/
                        {guide.slug}
                      </small>
                    </td>

                    <td>
                      {guide.location}
                    </td>

                    <td>
                      <span
                        className={
                          guide.status ===
                          "published"
                            ? "status live"
                            : "status"
                        }
                      >
                        {guide.status}
                      </span>
                    </td>

                    <td>

                      <button
                        className="delete-button"
                        type="button"
                        onClick={() =>
                          removeAreaGuide(
                            guide.id
                          )
                        }
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>
                  <td
                    colSpan="4"
                    className="table-empty"
                  >
                    No area guides yet.
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}

function LandlordGuide() {
  const faqs = [
    {
      question: "What documents do I need to lease my property in Dubai?",
      answer:
        "You will generally need your property ownership documents and identification details, together with the relevant tenancy and property documentation required to complete the leasing process.",
    },
    {
      question: "How do I know how much rent to charge?",
      answer:
        "Rental pricing should reflect the property's location, size, condition, amenities and current market demand. Golden Key can help you position your property competitively.",
    },
    {
      question: "What are the benefits of listing exclusively with one agent?",
      answer:
        "An exclusive relationship can provide clearer accountability, a coordinated marketing strategy and a single point of contact throughout the leasing process.",
    },
    {
      question: "Who handles maintenance and tenant issues during the tenancy?",
      answer:
        "Depending on the management arrangement, Golden Key can coordinate communication, maintenance requests and day-to-day property matters on the owner's behalf.",
    },
    {
      question: "How do I make sure I'm choosing the right tenant?",
      answer:
        "Tenant selection should consider suitability, documentation, affordability and the overall quality of the application. Our team can guide you through the process.",
    },
    {
      question: "How do I stay informed without being involved in every detail?",
      answer:
        "A structured management and reporting process keeps owners informed about important activity while allowing the day-to-day work to be handled by the management team.",
    },
  ];

  return (
    <>
      <Header />

      <main className="landlord-guide-page">

        {/* HERO */}
        <section className="landlord-hero">

          <div className="landlord-hero-bg" />
          <div className="landlord-hero-overlay" />

          <div className="wrap landlord-hero-content">

            <p className="landlord-eyebrow">
              GOLDEN KEY LANDLORD GUIDE
            </p>

            <h1>
              How to lease your
              <br />
              property in Dubai
            </h1>

            <p>
              A practical step-by-step guide to help you
              lease your property with confidence.
            </p>

            <div className="landlord-hero-actions">

              <a
                href="#landlord-content"
                className="landlord-coral-button"
              >
                Download Guide
              </a>

              <a
                href="#landlord-faq"
                className="landlord-video-button"
              >
                <span>▶</span>
                Watch Video
              </a>

            </div>

          </div>
        </section>

        {/* INTRO + FORM */}
        <section
          className="section landlord-intro"
          id="landlord-content"
        >

          <div className="wrap landlord-intro-grid">

            <article className="landlord-copy">

              <h2 className="landlord-serif">
                Leasing your property
                <br />
                doesn't have to
                <br />
                be complicated
              </h2>

              <p>
                Whether you're renting out one apartment or
                managing several homes, there are important
                decisions to make throughout the process.
              </p>

              <p>
                From understanding your property's value and
                choosing the right tenant to preparing the home
                and completing the required formalities,
                this guide brings everything together so you
                know what to expect from the moment you decide
                to lease your property.
              </p>

              <p>
                You'll gain a clearer understanding of valuation,
                documentation, marketing, viewings and the steps
                involved once a lease is agreed.
              </p>

              <p>
                Golden Key can also support landlords with
                professional marketing, tenant coordination
                and ongoing property management for owners
                who prefer a more hands-off approach.
              </p>

            </article>

            <aside className="landlord-form-card">

              <p className="landlord-form-label">
                GET IN TOUCH
              </p>

              <h3>
                Need help leasing your
                property?
              </h3>

              <p className="landlord-form-subtitle">
                Schedule a call with our team.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  alert(
                    "Thank you. Your enquiry has been received."
                  );
                }}
              >

                <input
                  required
                  placeholder="Name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email Address"
                />

                <input
                  required
                  placeholder="Phone Number"
                />

                <textarea
                  rows="6"
                  placeholder="Message"
                />

                <button
                  type="submit"
                  className="landlord-coral-button"
                >
                  Submit
                </button>

              </form>

            </aside>

          </div>
        </section>

        {/* FAQ */}
        <section
          className="section landlord-faq"
          id="landlord-faq"
        >

          <div className="wrap">

            <h2 className="landlord-serif">
              Frequently asked questions
            </h2>

            <div className="landlord-faq-list">

              {faqs.map((faq, index) => (

                <details
                  key={faq.question}
                  open={index === 0}
                >

                  <summary>
                    <span>
                      {faq.question}
                    </span>

                    <strong>
                      {index === 0 ? "−" : "+"}
                    </strong>
                  </summary>

                  <div className="landlord-faq-answer">
                    <p>
                      {faq.answer}
                    </p>
                  </div>

                </details>

              ))}

            </div>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}


function TenantGuide() {
  const faqs = [
    {
      question: "What documents will I need to rent a home in Dubai?",
      answer:
        "You will generally need your passport, Emirates ID and residency or visa documentation, together with any supporting information requested for your tenancy application. Your Golden Key consultant will let you know exactly what is required for your property.",
    },
    {
      question:
        "How do I set up water, electricity and cooling once I move in?",
      answer:
        "Once your tenancy documentation is completed, your Golden Key consultant can guide you through the utility connections you need for your new home, including electricity, water and cooling services.",
    },
    {
      question: "What is Ejari, and why do I need it?",
      answer:
        "Ejari is the tenancy registration system used in Dubai. Registering your tenancy helps formally document the rental agreement and provides an important part of the tenancy process.",
    },
    {
      question: "Can I bring my pet with me?",
      answer:
        "Pet policies vary by property and community. Before signing a tenancy agreement, confirm that the property and building allow your type of pet and check any applicable community rules.",
    },
    {
      question: "Do I need a move-in permit?",
      answer:
        "Some buildings and communities require tenants to arrange a move-in permit before moving into the property. Your Golden Key consultant can help you understand what your building requires.",
    },
    {
      question: "Who handles maintenance during my tenancy?",
      answer:
        "Maintenance arrangements depend on the tenancy agreement and property management structure. Golden Key can help coordinate communication between you, the landlord and the relevant maintenance team.",
    },
  ];

  return (
    <>
      <Header />

      <main className="tenant-guide-page">

        {/* HERO */}
        <section className="tenant-hero">

          <div className="tenant-hero-bg" />
          <div className="tenant-hero-overlay" />

          <div className="wrap tenant-hero-content">

            <p className="tenant-eyebrow">
              GOLDEN KEY TENANT GUIDE
            </p>

            <h1>
              How to rent
              <br />
              in Dubai
            </h1>

            <p>
              A step-by-step guide to help you
              rent with confidence in Dubai.
            </p>

            <div className="tenant-hero-actions">

              <a
                href="#tenant-content"
                className="tenant-coral-button"
              >
                Download now
              </a>

              <a
                href="#tenant-faq"
                className="tenant-video-button"
              >
                <span>▶</span>
                Watch Video
              </a>

            </div>

          </div>
        </section>

        {/* INTRO + FORM */}
        <section
          className="section tenant-intro"
          id="tenant-content"
        >

          <div className="wrap tenant-intro-grid">

            <article className="tenant-copy">

              <h2 className="tenant-serif">
                Renting in Dubai
                <br />
                doesn't have to
                <br />
                be complicated
              </h2>

              <p>
                Dubai's rental market offers a wide variety
                of homes, from modern city apartments and
                luxury residences to spacious family villas.
                But for new residents and experienced renters
                alike, understanding the process can sometimes
                feel overwhelming.
              </p>

              <p>
                Golden Key has created this guide to make the
                rental journey clearer, more practical and
                easier to follow. We take you through the
                key stages, from choosing a budget and area
                to securing your property and preparing for
                move-in.
              </p>

              <p>
                You'll learn what to consider before choosing
                a property, which documents you may need,
                how the tenancy process works and what to
                check before collecting your keys.
              </p>

            </article>

            <aside className="tenant-form-card">

              <p className="tenant-form-label">
                GET IN TOUCH
              </p>

              <h3>
                Need help renting
                a property?
              </h3>

              <p className="tenant-form-subtitle">
                Schedule a call with a Golden Key
                property consultant.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  alert(
                    "Thank you. Your enquiry has been received."
                  );
                }}
              >

                <input
                  required
                  placeholder="Name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email Address"
                />

                <input
                  required
                  placeholder="Phone Number"
                />

                <textarea
                  rows="6"
                  placeholder="Tell us what you're looking for"
                />

                <button
                  type="submit"
                  className="tenant-coral-button"
                >
                  Submit
                </button>

              </form>

            </aside>

          </div>
        </section>

        {/* RENTING PROCESS */}
        <section className="tenant-process">

          <div className="wrap">

            <p className="tenant-process-label">
              THE RENTAL JOURNEY
            </p>

            <h2 className="tenant-serif">
              Your step-by-step guide
              <br />
              to renting in Dubai
            </h2>

            {/* STEP 01 */}
            <article className="tenant-step">

              <div className="tenant-step-number">
                01
              </div>

              <div className="tenant-step-content">

                <h3>
                  Set a budget & choose a location
                </h3>

                <p>
                  Setting a realistic budget is one of the
                  most important first steps. Consider the
                  annual rent alongside your expected living
                  costs, including utilities, internet,
                  moving expenses, security deposit and any
                  applicable agency fees.
                </p>

                <p>
                  Rental prices in Dubai can vary considerably
                  depending on the community, property type,
                  size, amenities and whether the property is
                  furnished or unfurnished.
                </p>

                <p>
                  Start by identifying the areas that fit both
                  your lifestyle and budget, then compare
                  available properties before deciding where
                  you want to live.
                </p>

              </div>

            </article>

            {/* STEP 02 */}
            <article className="tenant-step">

              <div className="tenant-step-number">
                02
              </div>

              <div className="tenant-step-content">

                <h3>
                  Find the right real estate agent
                </h3>

                <p>
                  A knowledgeable property consultant can
                  significantly simplify your search,
                  particularly in a competitive rental market.
                </p>

                <p>
                  Your Golden Key consultant can help identify
                  properties that match your requirements,
                  arrange viewings and guide you through the
                  negotiation and leasing process.
                </p>

                <p>
                  Look for a consultant who understands the
                  areas you are considering and communicates
                  clearly throughout your search.
                </p>

              </div>

            </article>

            {/* STEP 03 */}
            <article className="tenant-step">

              <div className="tenant-step-number">
                03
              </div>

              <div className="tenant-step-content">

                <h3>
                  Secure the property & sign the contract
                </h3>

                <p>
                  Once you've found the right home and agreed
                  on the terms, your consultant will guide you
                  through the documents and payments required
                  to secure the property.
                </p>

                <p>
                  This may include identification documents,
                  tenancy-related paperwork, the agreed rental
                  payments and security deposit.
                </p>

                <p>
                  Make sure you understand the terms of the
                  tenancy agreement before signing. Any
                  important arrangements agreed between you
                  and the landlord should be clearly documented.
                </p>

              </div>

            </article>

            {/* STEP 04 */}
            <article className="tenant-step">

              <div className="tenant-step-number">
                04
              </div>

              <div className="tenant-step-content">

                <h3>
                  Register your Ejari
                </h3>

                <p>
                  Once your tenancy agreement has been signed,
                  the tenancy should be registered through the
                  Ejari system.
                </p>

                <p>
                  Your Golden Key consultant can explain the
                  documents and steps required for registration
                  and help make sure the tenancy paperwork is
                  properly completed.
                </p>

                <p>
                  Keep your completed tenancy documentation
                  safely stored, as it may be required when
                  arranging other services connected to your
                  new home.
                </p>

              </div>

            </article>

            {/* STEP 05 */}
            <article className="tenant-step">

              <div className="tenant-step-number">
                05
              </div>

              <div className="tenant-step-content">

                <h3>
                  Complete a thorough move-in inspection
                </h3>

                <p>
                  Before moving in, carefully inspect the
                  property and document its condition.
                </p>

                <div className="tenant-tips">

                  <div>
                    <strong>
                      Use a checklist
                    </strong>

                    <span>
                      Review rooms, fixtures, appliances,
                      doors, windows and other important areas.
                    </span>
                  </div>

                  <div>
                    <strong>
                      Take photos and videos
                    </strong>

                    <span>
                      Record any existing damage with clear
                      images for your records.
                    </span>
                  </div>

                  <div>
                    <strong>
                      Be meticulous
                    </strong>

                    <span>
                      Check cupboards, drawers, appliances,
                      fittings and other areas that are easy
                      to overlook.
                    </span>
                  </div>

                  <div>
                    <strong>
                      Get written confirmation
                    </strong>

                    <span>
                      Make sure agreed pre-existing issues
                      are documented appropriately.
                    </span>
                  </div>

                </div>

              </div>

            </article>

            {/* STEP 06 */}
            <article className="tenant-step">

              <div className="tenant-step-number">
                06
              </div>

              <div className="tenant-step-content">

                <h3>
                  Connect your utilities
                </h3>

                <p>
                  Once the tenancy documentation is complete,
                  you'll need to arrange the utilities required
                  for your home.
                </p>

                <p>
                  Depending on the property, this can include
                  electricity, water, cooling and other
                  essential services.
                </p>

                <p>
                  Your Golden Key consultant can help you
                  understand what needs to be arranged for
                  your particular property and community.
                </p>

                <a
                  href="#tenant-content"
                  className="tenant-text-link"
                >
                  Need more help renting in Dubai?
                  Speak with Golden Key →
                </a>

              </div>

            </article>

          </div>
        </section>

        {/* FAQ */}
        <section
          className="section tenant-faq"
          id="tenant-faq"
        >

          <div className="wrap">

            <h2 className="tenant-serif">
              Frequently asked questions
            </h2>

            <div className="tenant-faq-list">

              {faqs.map((faq, index) => (

                <details
                  key={faq.question}
                  open={index === 0}
                >

                  <summary>

                    <span>
                      {faq.question}
                    </span>

                    <strong>
                      {index === 0 ? "−" : "+"}
                    </strong>

                  </summary>

                  <div className="tenant-faq-answer">

                    <p>
                      {faq.answer}
                    </p>

                  </div>

                </details>

              ))}

            </div>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

function BuyerGuide() {
  return (
    <>
      <Header />

      <main className="buyer-guide-page">

        {/* HERO */}
        <section className="buyer-hero">
          <div className="buyer-hero-bg" />
          <div className="buyer-hero-overlay" />

          <div className="wrap buyer-hero-content">

            <p className="buyer-eyebrow">
              GOLDEN KEY BUYER GUIDE
            </p>

            <h1>
              How to buy a
              <br />
              property in Dubai
            </h1>

            <p>
              A step-by-step guide to help you
              buy a property with confidence.
            </p>

            <div className="buyer-hero-actions">

              <a
                href="#buyer-content"
                className="buyer-coral-button"
              >
                Download Brochure
              </a>

              <a
                href="#buyer-cta"
                className="buyer-video-button"
              >
                <span>▶</span>
                Watch Video
              </a>

            </div>

          </div>
        </section>

        {/* INTRO + FORM */}
        <section
          className="buyer-intro section"
          id="buyer-content"
        >
          <div className="wrap buyer-intro-grid">

            <article className="buyer-copy">

              <h2 className="buyer-serif">
                Buying a home in Dubai
                <br />
                is more than a
                <br />
                transaction; it’s the
                <br />
                start of a new chapter.
              </h2>

              <p>
                Whether you're buying your first home
                or making your next investment, the
                process can feel overwhelming without
                the right guidance.
              </p>

              <p>
                Golden Key has created this practical
                buyer's guide to help you understand
                the journey from your first property
                search through to completing your purchase.
              </p>

              <p className="buyer-highlight">
                Our guide walks you through the key
                stages of buying property in Dubai,
                helping you make informed decisions
                and move forward with confidence.
              </p>

            </article>

            <aside className="buyer-form-card">

              <p className="buyer-form-label">
                GET IN TOUCH
              </p>

              <h3>
                Need help buying?
                <br />
                Schedule a call with us
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  alert(
                    "Thank you. Your enquiry has been received."
                  );
                }}
              >

                <input
                  required
                  placeholder="Name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email Address"
                />

                <input
                  required
                  placeholder="Phone Number"
                />

                <textarea
                  rows="6"
                  placeholder="Message"
                />

                <button
                  type="submit"
                  className="buyer-coral-button"
                >
                  Submit
                </button>

              </form>

            </aside>

          </div>
        </section>

        {/* FINAL CTA */}
        <section
          className="buyer-cta"
          id="buyer-cta"
        >

          <div className="wrap">

            <p className="buyer-cta-label">
              GET IN TOUCH
            </p>

            <h2>
              Ready to find your
              <br />
              new home or next
              <br />
              investment?
            </h2>

            <p>
              Connect with a Golden Key property
              consultant and take the next step.
            </p>

            <a
              href="/enquire"
              className="buyer-coral-button"
            >
              Get In Touch
            </a>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}


function SellerGuide() {
  return (
    <>
      <Header />

      <main className="seller-guide-page">

        {/* HERO */}
        <section className="seller-hero">
          <div className="seller-hero-bg" />
          <div className="seller-hero-overlay" />

          <div className="wrap seller-hero-content">

            <p className="seller-eyebrow">
              GOLDEN KEY SELLER GUIDE
            </p>

            <h1>
              How to sell a
              <br />
              property in Dubai
            </h1>

            <p>
              A step-by-step guide to help you sell
              your property with confidence.
            </p>

            <div className="seller-hero-actions">

              <a
                href="#seller-content"
                className="seller-coral-button"
              >
                Download Brochure
              </a>

              <a
                href="#seller-cta"
                className="seller-video-button"
              >
                <span>▶</span>
                Watch Video
              </a>

            </div>

          </div>
        </section>

        {/* INTRO + FORM */}
        <section
          className="section seller-intro"
          id="seller-content"
        >

          <div className="wrap seller-intro-grid">

            <article className="seller-copy">

              <p className="seller-intro-small">
                Selling a home is a major decision,
                and the process should feel clear
                from the start.
              </p>

              <h2 className="seller-serif">
                Selling a home is a major
                decision, and the process
                should feel clear from the
                start.
              </h2>

              <p>
                Your property deserves a considered
                approach. From understanding its market
                position and choosing the right strategy
                to preparing, marketing and negotiating,
                every step can make a difference.
              </p>

              <p>
                Golden Key's seller guide is designed
                to help you understand the journey,
                prepare your property effectively and
                make decisions with greater clarity.
              </p>

              <p>
                We cover the practical stages involved
                in selling, from pricing and presentation
                to viewings, offers and completion, so
                you know what to expect throughout the
                process.
              </p>

              <p className="seller-highlight">
                With the right preparation and the right
                guidance, selling your property can feel
                straightforward, informed and well supported.
              </p>

            </article>

            <aside className="seller-form-card">

              <p className="seller-form-label">
                GET IN TOUCH
              </p>

              <h3>
                Need help selling?
                <br />
                Schedule a call with us
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  alert(
                    "Thank you. Your enquiry has been received."
                  );
                }}
              >

                <input
                  required
                  placeholder="Name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email Address"
                />

                <input
                  required
                  placeholder="Phone Number"
                />

                <textarea
                  rows="6"
                  placeholder="Tell us about your property"
                />

                <button
                  type="submit"
                  className="seller-coral-button"
                >
                  Submit
                </button>

              </form>

            </aside>

          </div>
        </section>

        {/* FINAL CTA */}
        <section
          className="seller-cta"
          id="seller-cta"
        >

          <div className="wrap">

            <p className="seller-cta-label">
              GET IN TOUCH
            </p>

            <h2>
              Ready to sell
              <br />
              your property?
            </h2>

            <p>
              Connect with Golden Key and arrange
              a conversation about your property,
              its market position and the right next step.
            </p>

            <a
              href="/enquire"
              className="seller-coral-button"
            >
              Get In Touch
            </a>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/pixxi/properties?purpose=new&page=1&size=100"
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
            "Could not load projects."
          );
        }

        if (!cancelled) {
          setProjects(
            Array.isArray(data.properties)
              ? data.properties
              : []
          );
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "We couldn't load the latest projects."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProjects = projects.filter(
    (project) => {
      const text = `
        ${project.title || ""}
        ${project.location || ""}
        ${project.city || ""}
        ${project.developer?.name || ""}
      `.toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    }
  );

  return (
    <>
      <Header />

      <main className="projects-page">

        {/* HERO */}

        <section className="projects-hero">

          <div className="projects-hero-bg" />

          <div className="projects-hero-overlay" />

          <div className="wrap projects-hero-content">

            <p className="projects-eyebrow">
              GOLDEN KEY PROJECTS
            </p>

            <h1>
              Discover Dubai's
              <br />
              new developments
            </h1>

            <p>
              Explore off-plan developments,
              new communities and investment
              opportunities sourced directly
              from our CRM.
            </p>

          </div>

        </section>

        {/* FILTER */}

        <section className="projects-filter-section">

          <div className="wrap">

            <div className="projects-search">

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search projects, developers or communities"
              />

            </div>

          </div>

        </section>

        {/* PROJECTS */}

        <section className="section projects-list-section">

          <div className="wrap">

            {loading && (
              <div className="empty-state">
                <h3 className="serif">
                  Loading projects...
                </h3>
              </div>
            )}

            {!loading && error && (
              <div className="empty-state">
                <h3 className="serif">
                  Projects temporarily unavailable
                </h3>

                <p>{error}</p>
              </div>
            )}

            {!loading &&
              !error &&
              filteredProjects.length > 0 && (
                <div className="projects-grid">

                  {filteredProjects.map(
                    (project) => (
                      <a
                        key={
                          project.id ||
                          project.reference
                        }
                        href={`/projects/${project.id}`}
                        className="project-card"
                      >

                        <div className="project-card-image">

                          <img
                            src={
                              project.image1 ||
                              IMG[0]
                            }
                            alt={
                              project.title
                            }
                          />

                          <span className="project-status">
                            New
                          </span>

                        </div>

                        <div className="project-card-body">

                          <p className="project-location">
                            {project.location ||
                              project.city}
                          </p>

                          <h2>
                            {project.title}
                          </h2>

                          {project.developer?.name && (
                            <p className="project-developer">
                              By{" "}
                              {
                                project.developer
                                  .name
                              }
                            </p>
                          )}

                          <div className="project-meta">

                            {project.price > 0 && (
                              <span>
                                From{" "}
                                {Number(
                                  project.price
                                ).toLocaleString(
                                  "en-AE"
                                )}{" "}
                                AED
                              </span>
                            )}

                            {project.handoverTime && (
                              <span>
                                Handover{" "}
                                {
                                  project.handoverTime
                                }
                              </span>
                            )}

                          </div>

                          <span className="project-card-link">
                            View project →
                          </span>

                        </div>

                      </a>
                    )
                  )}

                </div>
              )}

            {!loading &&
              !error &&
              filteredProjects.length === 0 && (
                <div className="empty-state">

                  <h3 className="serif">
                    No projects found
                  </h3>

                  <p>
                    Try another developer,
                    community or project name.
                  </p>

                </div>
              )}

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

function ProjectDetail({ id }) {
  const [project, setProject] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/pixxi/project?id=${encodeURIComponent(
            id
          )}`
        );

        const data =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
            "Could not load project."
          );
        }

        if (!cancelled) {
          setProject(
            data.project
          );
        }

      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "Unable to load this project."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />

        <main className="page-placeholder">

          <div className="wrap">

            <h1 className="serif">
              Loading project...
            </h1>

          </div>

        </main>

        <Footer />
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <Header />

        <main className="page-placeholder">

          <div className="wrap">

            <h1 className="serif">
              Project unavailable
            </h1>

            <a
              href="/projects"
              className="button-outline"
            >
              ← Back to projects
            </a>

          </div>

        </main>

        <Footer />
      </>
    );
  }

  const images =
    Array.isArray(project.photos)
      ? project.photos
      : Array.isArray(project.images)
      ? project.images
      : [];

  const newParam =
    project.newParam ||
    {};

  return (
    <>
      <Header />

      <main className="project-detail-page">

        {/* HERO */}

        <section className="project-detail-hero">

          <img
            src={
              images[0] ||
              project.image ||
              IMG[0]
            }
            alt={
              project.title
            }
          />

          <div className="project-detail-overlay" />

          <div className="wrap project-detail-hero-content">

            <p>
              GOLDEN KEY PROJECT
            </p>

            <h1>
              {
                project.title ||
                "New Project"
              }
            </h1>

            <span>
              {project.region ||
                project.community ||
                project.cityName ||
                ""}
            </span>

          </div>

        </section>

        {/* OVERVIEW */}

        <section className="section">

          <div className="wrap project-detail-grid">

            <article className="project-detail-main">

              <p className="projects-eyebrow">
                PROJECT OVERVIEW
              </p>

              <h2 className="serif">
                {project.title}
              </h2>

              <div
                className="project-description"
                dangerouslySetInnerHTML={{
                  __html:
                    String(
                      project.description ||
                      ""
                    ).replace(
                      /\n/g,
                      "<br />"
                    ),
                }}
              />

              {/* PROJECT STATS */}

              <div className="project-stats">

                {project.price > 0 && (
                  <div>
                    <strong>
                      From
                    </strong>

                    <span>
                      {Number(
                        project.price
                      ).toLocaleString(
                        "en-AE"
                      )}{" "}
                      AED
                    </span>
                  </div>
                )}

                {newParam.totalUnits && (
                  <div>
                    <strong>
                      Total units
                    </strong>

                    <span>
                      {
                        newParam.totalUnits
                      }
                    </span>
                  </div>
                )}

                {newParam.handoverTime && (
                  <div>
                    <strong>
                      Handover
                    </strong>

                    <span>
                      {
                        newParam.handoverTime
                      }
                    </span>
                  </div>
                )}

                {(
                  newParam.bedroomMin ||
                  newParam.bedroomMax
                ) && (
                  <div>
                    <strong>
                      Bedrooms
                    </strong>

                    <span>
                      {
                        newParam.bedroomMin
                      }
                      {" – "}
                      {
                        newParam.bedroomMax
                      }
                    </span>
                  </div>
                )}

              </div>

              {/* GALLERY */}

              {images.length > 0 && (
                <section className="project-gallery">

                  <h3 className="serif">
                    Project gallery
                  </h3>

                  <div className="project-gallery-grid">

                    {images.map(
                      (image, index) => (

                        <div
                          key={`${image}-${index}`}
                          className={
                            index === 0
                              ? "project-gallery-item large"
                              : "project-gallery-item"
                          }
                        >

                          <img
                            src={image}
                            alt={`${project.title} ${index + 1}`}
                          />

                        </div>

                      )
                    )}

                  </div>

                </section>
              )}

              {/* PAYMENT PLAN */}

              {newParam.paymentPlan && (
                <section className="project-payment">

                  <h3 className="serif">
                    Payment plan
                  </h3>

                  <pre>
                    {typeof newParam.paymentPlan ===
                    "string"
                      ? newParam.paymentPlan
                      : JSON.stringify(
                          newParam.paymentPlan,
                          null,
                          2
                        )}
                  </pre>

                </section>
              )}

              {/* FLOOR PLANS */}

              {Array.isArray(
                newParam.floorPlan
              ) &&
                newParam.floorPlan.length >
                  0 && (

                  <section className="project-floorplans">

                    <h3 className="serif">
                      Floor plans
                    </h3>

                    <div className="floorplan-grid">

                      {newParam.floorPlan.map(
                        (plan, index) => {

                          const image =
                            typeof plan ===
                            "string"
                              ? plan
                              : plan?.url ||
                                plan?.imageUrl ||
                                plan?.fileUrl ||
                                plan?.image ||
                                "";

                          return (
                            <div
                              key={index}
                              className="floorplan-card"
                            >

                              {image ? (
                                <img
                                  src={image}
                                  alt={`Floor plan ${
                                    index + 1
                                  }`}
                                />
                              ) : (
                                <pre>
                                  {JSON.stringify(
                                    plan,
                                    null,
                                    2
                                  )}
                                </pre>
                              )}

                            </div>
                          );
                        }
                      )}

                    </div>

                  </section>
                )}

            </article>

            {/* SIDEBAR */}

            <aside className="project-detail-sidebar">

              <div className="project-enquiry-card">

                <p>
                  INTERESTED IN THIS PROJECT?
                </p>

                <h3>
                  Speak with a Golden Key
                  project consultant.
                </h3>

                <EnquiryForm
                  property={{
                    reference:
                      project.propertyId ||
                      project.id,
                  }}
                  compact
                />

              </div>

              {(project.brochureUrl ||
                project.brochure) && (

                <a
                  href={
                    project.brochureUrl ||
                    project.brochure
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="project-brochure-button"
                >
                  ↓ Download brochure
                </a>
              )}

            </aside>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
function App() {
  const path =
    window.location.pathname
      .toLowerCase()
      .replace(/\/+$/, "") || "/";

  // ADMIN
  if (path === "/admin") {
    return <Admin />;
  }

  // HOME
  if (path === "/") {
    return (
      <>
        <Header />
        <Hero />
        <Diamonds />
        <ListingStrip />
        <Story />
        <MarketPanel />
        <ServicesTeaser />
        <GlobalSection />
        <Reviews />
        <Articles />
        <Enquire />
        <Footer />
      </>
    );
  }

  if (path === "/projects") {
  return <Projects />;
}

if (path.startsWith("/projects/")) {
  const id = path.split("/projects/")[1];

  return (
    <ProjectDetail id={id} />
  );
}

  // BUY
  if (path === "/buy") {
    return <ListingPage rent={false} />;
  }

  // RENT
  if (path === "/rent") {
    return <ListingPage rent={true} />;
  }

  // PROPERTY DETAIL
  if (path.startsWith("/properties/")) {
    const id = path.split("/properties/")[1];

    return <PropertyDetail id={id} />;
  }

  // SERVICES OVERVIEW
  if (path === "/services") {
    return <ServicesPage />;
  }

  if (path === "/guides/tenant-guide") {
  return <TenantGuide />;
  }

  // SERVICES
 if (path === "/services/property-management") {
  return <PropertyManagement />
}

if (path === "/services/development-sales-and-consultancy") {
  return <DevelopmentSalesConsultancy />
}

if (path === "/services/property-valuation") {
  return <PropertyValuation />;
}

if (path === "/services/holiday-home-services") {
  return (
    <ServiceDetail
      eyebrow="Holiday Home Services"
      title="Make short-term property ownership simpler"
      description="Support for owners who want their holiday home presented, managed and cared for while they are away."
      image="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1800&q=90"
      sections={[
        {
          eyebrow: "PRESENTATION",
          title: "Make every stay count",
          text: "Strong presentation, guest-ready standards and thoughtful property care help create a better experience for both owners and guests.",
          image: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=88",
        },
        {
          eyebrow: "MANAGEMENT",
          title: "More convenience, less operational work",
          text: "We help coordinate the practical side of short-term stays so owners can enjoy greater visibility without being involved in every detail.",
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=88",
        },
      ]}
    />
  );
}

if (path === "/services/citizenship-program") {
  return (
    <ServiceDetail
      eyebrow="Citizenship Program"
      title="Property-led pathways for your next chapter"
      description="Explore international mobility and investment opportunities through a structured property advisory experience."
      image="https://images.unsplash.com/photo-1524813686514-a57563d77965?auto=format&fit=crop&w=1800&q=90"
      sections={[
        {
          eyebrow: "ADVISORY",
          title: "Understand the opportunity",
          text: "We help clients understand the property and investment side of international mobility opportunities, with a focus on clarity and informed decisions.",
          image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=88",
        },
        {
          eyebrow: "GUIDANCE",
          title: "A more considered journey",
          text: "From initial questions to selecting suitable opportunities, our team helps simplify the process and connect you with the right next steps.",
          image: "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=88",
        },
      ]}
    />
  );
}

  // INSIGHTS
  if (path === "/insights") {
    return <Insights />;
  }

  if (path === "/guides/area-guides") {
  return <AreaGuides />;
}

  if (path.startsWith("/guides/area-guides/")) {
    const slug = path.split(
      "/guides/area-guides/"
    )[1];

    return (
      <AreaGuideDetail slug={slug} />
    );
  }

  if (path === "/guides/buyer-guide") {
  return <BuyerGuide />;
  }

  if (path === "/guides/seller-guide") {
  return <SellerGuide />;
  }

  // GUIDES
  if (path === "/guides") {
    return <Guides />;
  }

  if (path === "/guides/landlord-guide") {
  return <LandlordGuide />;
  }

  // ABOUT
  if (path === "/about") {
    return <About />;
  }

  if (path === "/enquire") {
    return <EnquirePage />;
  }

  // FALLBACK
  return (
    <Page
      title="Page"
      kicker="Betterhomes"
      text="This page is ready for the client's final content."
    />
  );
}
export default App;