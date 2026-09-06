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
  ],
};

const servicesMenu = [
  {
    label: "Property Management",
    path: "/services/property-management",
  },
  {
    label: "Property Valuation",
    path: "/services/property-valuation",
  },
  {
    label: "Mortgage Services",
    path: "/services/mortgage-services",
  },
  {
    label: "Holiday Home Services",
    path: "/services/holiday-home-services",
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

const STORAGE_KEY = "goldenkey.properties.v1";


// Module-level cache so the seed fetch (properties.json) only ever
// runs once, even if multiple components call loadProperties() at
// nearly the same time on first load. Without this, a manual "Add
// listing" done in the admin panel while the seed fetch is still in
// flight could get silently overwritten once that fetch resolved.
let seedLoadPromise = null;


const AREA_GUIDES_STORAGE_KEY = "goldenkey.area-guides.v1";

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
        <p className="kicker centered">Golden Key in numbers</p>
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
            <img
              src="/golden-key-logo.png"
              alt="Golden Key Real Estate"
            />
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
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFeatured() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/pixxi/properties?purpose=buy&page=1&size=4`
        );

        const data = await response.json();

        if (!cancelled && data.success) {
          setProperties(
            Array.isArray(data.properties) ? data.properties : []
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFeatured();

    return () => {
      cancelled = true;
    };
  }, []);

  return <section className="section offplan"><div className="wrap"><div className="row-head"><div><p className="kicker">Featured properties</p><h2 className="serif">Find your next move</h2></div><a href="/buy" className="underlink">View all →</a></div>
    {!loading && properties.length===0?<p className="empty-copy">No published listings yet.</p>:<div className="cards">{properties.map(x=><PropertyCard key={x.id} x={x}/>)}</div>}
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

function Footer(){return <footer className="footer"><div className="wrap footer-top"><div><a href="/rent">Rent</a><a href="/services">Services</a></div><div><h4>Knowledge</h4><a href="/insights">Insights</a><a href="/guides">Guides</a><a href="/about">About</a></div><div><h4>Contact</h4><a href="/enquire">Enquire now</a><span>Dubai, UAE</span></div></div><div className="wrap footer-bottom"><span>© 2026 Golden Key — Demo build</span><span>Privacy · Terms</span></div></footer>;}

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
      (Array.isArray(property.propertyType)
        ? property.propertyType.includes(type)
        : property.propertyType === type);

    return (
      matchesSearch &&
      matchesType
    );
  });

  const availableTypes = ["Apartment", "Townhouse", "Villa"];

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
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`goldenkey-${purpose}-sample-layout.csv`;a.click();URL.revokeObjectURL(a.href);
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
    "goldenkey.area-guides.v1";

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
            golden<span>key</span>
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
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProperty() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/pixxi/project?id=${encodeURIComponent(id)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Could not load property.");
        }

        if (!cancelled) {
          const p = data.project;

          const purpose =
            p.listingType === "RENT"
              ? "rent"
              : p.listingType === "NEW"
              ? "new"
              : "buy";

          setProperty({
            ...p,
            purpose,
            location: p.community || p.region || "",
            propertyType: p.propertyType?.[0] || "Property",
            bedrooms: p.bedrooms,
            bathrooms: p.details?.bathrooms,
            area: p.size,
            images: p.photos,
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Unable to load this property.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProperty();

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
            <h1 className="serif">Loading property...</h1>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <Header />
        <main className="page-placeholder">
          <div className="wrap">
            <h1 className="serif">Property not found</h1>
            <a href="/buy" className="underlink">← Back to listings</a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const images = property.images?.length ? property.images : [IMG[0]];

  return (
    <>
      <Header />

      <main className="property-detail">
        <div className="wrap">

          <div className="property-breadcrumb">
            <a href={property.purpose === "rent" ? "/rent" : "/buy"}>
              {property.purpose === "rent" ? "Rent" : "Buy"}
            </a>
            <span>/</span>
            <span>{property.location}</span>
          </div>

          <section className="detail-gallery">
            <div className="detail-main-image">
              <img src={images[activeImage]} alt={property.title} />
            </div>

            <div className="detail-thumbnails">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  className={activeImage === index ? "thumbnail active" : "thumbnail"}
                  onClick={() => setActiveImage(index)}
                >
                  <img src={image} alt={`${property.title} ${index + 1}`} />
                </button>
              ))}
            </div>
          </section>

          <section className="detail-content">

            <div className="detail-main">

              <p className="kicker">{property.propertyType}</p>

              <h1 className="serif">{property.title}</h1>

              <p className="detail-location">{property.location}</p>

              <div className="detail-price">
                {money(property.price, property.purpose)}
              </div>

              <div className="property-specs">
                <div>
                  <strong>{property.bedrooms || 0}</strong>
                  <span>Bedrooms</span>
                </div>

                <div>
                  <strong>{property.bathrooms || 0}</strong>
                  <span>Bathrooms</span>
                </div>

                <div>
                  <strong>{(property.area || 0).toLocaleString()}</strong>
                  <span>Sq Ft</span>
                </div>
              </div>

              <div className="detail-description">
                <h2 className="serif">Property Description</h2>
                <p>
                  {property.description ||
                    "Contact our team for further information about this property."}
                </p>
              </div>

            </div>

            <aside className="detail-contact">
              <div className="contact-card">
                <h3>Interested in this property?</h3>
                <p>Send an enquiry and our team will get back to you.</p>

                <EnquiryForm
                  property={{ reference: property.propertyId }}
                  compact
                />
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
      image: "/team/zaid-zakariya.jpg",
    },
    {
      name: "Arsalan Altaf",
      role: "Marketing Manager",
      image: "/team/arsalan-altaf.jpg",
    },
    {
      name: "Toufik Mirouch",
      role: "Property Consultant",
      image: "/team/toufik-mirouch.jpg",
    },
    {
      name: "Vaishali Thakor",
      role: "Property Consultant",
      image: "/team/vaishali-thakor.jpg",
    },
    {
      name: "Arooj Fatima",
      role: "Property Consultant",
      image: "/team/arooj-fatima.jpg",
    },
    {
      name: "Niaz Amjad",
      role: "Property Consultant",
      image: "/team/niaz-amjad.jpg",
    },
    {
      name: "Mahmoud Essam",
      role: "Property Consultant",
      image: "/team/mahmoud-essam.jpg",
    },
    {
      name: "Takwa Doral",
      role: "Property Consultant",
      image: "/team/takwa-doral.jpg",
    },
    {
      name: "Maria Alcaz",
      role: "Administrator",
      image: "/team/maria-alcaz.jpg",
    },
    {
      name: "Sharouk Mousa",
      role: "Property Consultant",
      image: "/team/sharouk-mousa.jpg",
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
      path: "/guides/tenant-guide",
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

                <a
                  href="#contact"
                  className="button-coral"
                >
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


const INSIGHT_ARTICLES = [
  {
    slug: "al-maktoum-airport-dubai-south-impact",
    category: "Market Report",
    date: "August 2026",
    title: "Impact of Al Maktoum International Airport on Dubai South Real Estate",
    excerpt: "How the world's largest planned aviation hub could reshape housing demand, investment activity and long-term property values in Dubai South.",
    heroImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1800&q=90",
    sections: [
      { heading: "Executive Summary", paragraphs: [
        "Dubai South is entering a more advanced stage of its development cycle. The expansion of Al Maktoum International Airport (DWC) is increasingly shifting the area from a long-term infrastructure story into an active delivery story, with major construction packages progressing during 2026.",
        "The airport is planned to become the world's largest aviation hub by capacity, with more than 260 million passengers and 12 million tonnes of annual cargo at full build-out. The first major phase is designed for around 150 million passengers annually, while Dubai's long-term strategy anticipates a substantial city, employment base and residential ecosystem around the airport.",
        "For real estate, the key impact is not passenger volume alone. The stronger investment case is the combination of airport-led employment, logistics and aviation expansion, supporting infrastructure, future transport connectivity and a larger population living closer to jobs in Dubai South.",
        "Current market indicators show that this repricing has already started, although performance is not uniform. Bayut's Dubai South sale index recorded an average of AED 1,489 per sq.ft. in July 2026, up 2.91% year-on-year. Its H1 2026 market report placed Dubai South affordable apartments at an average AED 1,190 per sq.ft. with an indicative ROI of 7.24%. Rental index data also showed rents at AED 77 per sq.ft. in May 2026, 4.37% higher than a year earlier.",
        "Goldenkey's view is that Al Maktoum International Airport strengthens Dubai South's medium- to long-term fundamentals, but project selection will remain critical. Investors should avoid assuming that every property in Dubai South will benefit equally from the airport expansion. Entry price, developer quality, construction progress, location, unit type, supply pipeline and actual rental demand will determine outcomes.",
      ]},
      { heading: "Why Al Maktoum International Airport Matters", paragraphs: [
        "In April 2024, Dubai approved the design and construction of the new passenger terminal at Al Maktoum International Airport at a reported cost of AED 128 billion. At full development, the airport is planned to handle more than 260 million passengers per year and 12 million tonnes of cargo annually across an approximately 70-square-kilometre airport footprint.",
        "The airport master plan includes five parallel runways, large-scale passenger processing infrastructure, hundreds of aircraft stands, automated passenger movement and an integrated landside transport hub. The first major development phase is planned for approximately 150 million passengers annually in the early 2030s.",
        "For Dubai South real estate, the most important official statement is the expectation that the airport and surrounding economic ecosystem could generate residential requirements for more than one million people living and working in the wider aerotropolis over the long term. This provides a direct link between aviation investment and future housing demand.",
      ]},
      { heading: "2026: From Announcement to Physical Delivery", paragraphs: [
        "The 2026 market narrative is different from 2024. Investors are no longer evaluating only an approved master plan. In June 2026, Dubai's Media Office reported significant milestones across major delivery streams, including substructure and superstructure works for the Western Passenger Terminal, aircraft concourses, the Automated People Mover, baggage handling, southern airfield infrastructure, power generation and district cooling.",
        "This matters because infrastructure-led real estate markets often behave differently once construction becomes visible and capital deployment is underway. The project remains long term, but continued package awards and physical works can reduce uncertainty around execution and improve confidence in surrounding districts.",
      ]},
      { heading: "Employment Creation Could Be the Strongest Property Driver", paragraphs: [
        "Airports function as economic ecosystems. They create direct employment in airlines, airport operations and aviation services, but also generate indirect demand across logistics, cargo, engineering, hospitality, retail, transportation, warehousing, professional services and technology.",
        "A 2024 economic impact assessment cited by Dubai's Media Office estimated that construction of the DWC expansion could contribute AED 6.1 billion to Dubai GDP in 2030 and support 132,000 jobs. While that figure relates to the airport project rather than residential demand alone, it illustrates the scale of economic activity associated with the expansion.",
        "In May 2026, Emirates broke ground on a US$5.1 billion engineering complex in Dubai South. The facility is planned as a major maintenance, repair and overhaul centre capable of handling 28 wide-body aircraft simultaneously. Projects of this scale deepen the employment base around DWC and can support more sustainable rental demand than a market driven only by future expectations.",
      ]},
      { heading: "Dubai South Residential Market: Current Snapshot", paragraphs: [
        "Dubai South has already recorded measurable price and rental movement. Bayut's sale index showed an average property price of AED 1,489 per sq.ft. in July 2026, compared with AED 1,446 per sq.ft. twelve months earlier and AED 1,375 per sq.ft. twenty-four months earlier.",
        "The H1 2026 Bayut sales report classified Dubai South among affordable apartment communities and recorded an average asking price of AED 1,190 per sq.ft., an average transaction value of approximately AED 842,220 and an indicative apartment ROI of 7.24%. In the villa segment, Dubai South recorded an average of AED 1,368 per sq.ft. and an indicative ROI of 4.92%.",
        "Rental index data showed an average of AED 77 per sq.ft. in May 2026, up 4.37% year-on-year. These figures should be treated as area-level indicators rather than guaranteed returns for individual units.",
      ]},
      { heading: "Five Ways the Airport Could Reshape Dubai South Real Estate", paragraphs: [
        "1) Larger tenant and end-user pool — as employment grows around DWC, more workers and families may prefer to live closer to their workplace, improving occupancy and reducing dependence on tenants commuting from established central districts.",
        "2) Stronger investor attention — the airport gives Dubai South a clearer economic identity, positioning it as a future aviation, logistics and business hub rather than just an emerging residential area.",
        "3) More commercial and lifestyle infrastructure — population and employment growth can support additional retail, hospitality, schools, healthcare, leisure and business services, improving liveability and, over time, supporting property values.",
        "4) Connectivity improvements — the airport master plan incorporates integrated road, rail and public transport connectivity, expanding the potential buyer and tenant base beyond people directly employed in the aviation district.",
        "5) Long-term capital appreciation potential — large infrastructure projects can create conditions for appreciation when they translate into jobs, population growth, improved connectivity and services, although the impact is likely to be uneven between projects and submarkets.",
      ]},
      { heading: "Where the Investment Opportunity May Be Strongest", paragraphs: [
        "Properties near genuine employment nodes with convenient access to aviation, logistics and commercial zones may be better positioned for employee-led rental demand. Projects with sensible entry pricing matter too — buying into the airport story at an inflated price can reduce future upside, so investors should compare price per sq.ft. against competing Dubai South projects, ready inventory and other emerging Dubai communities.",
        "Efficient unit types also matter: studios and one-bedroom apartments may benefit from demand among individual professionals and couples, while townhouses and villas may appeal to families as schools and community infrastructure mature. Projects with credible delivery — construction progress, escrow compliance, developer track record and realistic handover schedules — remain important because a long-term area thesis does not remove project-specific execution risk. Assets suited to a longer holding period are best placed to benefit, since the full airport transformation will unfold over years.",
      ]},
      { heading: "Risks Investors Should Not Ignore", paragraphs: [
        "Future supply: Dubai South has a substantial development pipeline, and high supply can limit rent growth or create competition between landlords, particularly around clustered handovers.",
        "Timeline risk: the airport is a multi-phase project, so investors should distinguish between near-term milestones and ultimate master-plan outcomes.",
        "Project selection risk: a strong community-level story does not automatically make every building a strong investment — layout, views, maintenance quality, service charges and resale liquidity remain important.",
        "Pricing in expectations: as awareness of DWC increases, some future benefits may already be reflected in launch prices, so investors should focus on value rather than buying solely because a project is marketed as being close to the airport.",
        "Rental assumptions: area-level yields are not guaranteed — net returns depend on actual rent, vacancy, service charges, furnishing, maintenance, financing costs and acquisition price.",
      ]},
      { heading: "Goldenkey Investor Lens", paragraphs: [
        "The long-term case for Dubai South has strengthened because the area now combines major public infrastructure with private-sector aviation investment and an expanding residential market. The airport is likely to be a structural demand driver rather than a one-time event.",
        "The more useful question is not whether Dubai South prices will rise because the airport is being built, but which properties are priced attractively today relative to the jobs, transport links, community infrastructure and tenant demand likely to exist by the time those properties are completed or resold.",
        "For investors with a medium- to long-term horizon, Dubai South can offer a compelling combination of comparatively accessible entry prices, rental yield potential and infrastructure-led growth. For shorter-term buyers, greater attention should be paid to current transaction liquidity, handover schedules and the volume of competing supply coming to market.",
      ]},
    ],
    disclaimer: "Market data in this report is based on publicly available asking-price indices, transaction references and third-party market reports available as of August 2026. Figures may change and should not be treated as guaranteed returns, valuation advice or a promise of future capital appreciation. Buyers should conduct project-specific due diligence before making an investment decision.",
  },

  {
    slug: "rent-to-own-dubai",
    category: "Blog",
    date: "August 2026",
    title: "From Tenant to Homeowner: How Rent-to-Own Property Works in Dubai",
    excerpt: "A practical guide to lease-to-own structures, buyer considerations, costs, risks, and when this route may make sense.",
    heroImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1800&q=90",
    sections: [
      { heading: "What Does Rent-to-Own Mean in Dubai?", paragraphs: [
        "Dubai offers several routes into property ownership: cash purchases, mortgages, off-plan payment plans, developer financing, and lease-to-own arrangements. For buyers who want to live in a property now while working toward ownership, rent-to-own can be an attractive alternative — particularly when a traditional mortgage or large upfront payment is not the preferred route.",
        "However, rent-to-own is not simply \"rent that automatically becomes a home purchase.\" It is a contractual structure with specific purchase terms, timelines, payment allocations, registration requirements, and possible financing conditions. A rent-to-own or lease-to-own arrangement allows an occupier to use a property under an agreed lease structure while following a defined route toward acquiring ownership. Depending on the contract, some payments may be credited toward the eventual purchase price, while other amounts may remain purely rental, financing, service, or administrative costs.",
        "Dubai Land Department (DLD) maintains formal services for registering Lease-to-Own contracts, covering arrangements involving the property seller, purchaser and, where applicable, a financing party — meaning a properly structured lease-to-own transaction can be part of the formal real estate registration system rather than only a private rental understanding.",
      ]},
      { heading: "How the Structure Can Work", paragraphs: [
        "There is no single payment plan that applies to every rent-to-own property, but a typical arrangement includes: the buyer selecting an eligible property offered under a lease-to-own structure; the parties agreeing the property price, lease period, payment schedule, purchase conditions, fees, and treatment of payments; the buyer occupying the property and making the agreed periodic payments; at the agreed milestone or end of term, the buyer completing the purchase according to the contract — potentially using cash, financing, or another approved settlement method; and, once contractual, financial and registration requirements are completed, ownership being transferred or documented in accordance with the applicable process.",
        "The important point is that monthly payments should never be assumed to equal equity. The agreement must clearly state what portion, if any, contributes toward the purchase and what happens if the buyer does not complete the transaction.",
      ]},
      { heading: "Why Buyers Consider Rent-to-Own", paragraphs: [
        "Lower immediate pressure for a large purchase payment compared with some traditional buying structures. Ability to live in the property while progressing toward a potential purchase. More time to organise savings, liquidity, or future financing, depending on the agreement. A possible alternative for buyers who prefer a structured payment route rather than purchasing in one step. Potential price visibility if the future purchase price is fixed in the contract, although this can also become a disadvantage if market conditions change.",
      ]},
      { heading: "The Main Questions to Ask Before Signing", paragraphs: [
        "What is the final purchase price? Confirm whether it is fixed from day one, calculated later, or linked to a future valuation or formula.",
        "How much of each payment goes toward the purchase? Ask for a clear payment breakdown — do not assume the full monthly amount reduces the property balance.",
        "Is there an upfront option, booking, security, or commitment payment? Understand whether it is refundable, non-refundable, credited toward the purchase, or treated separately.",
        "What happens if you decide not to buy? The agreement should explain cancellation consequences, deductions, forfeited amounts, notice periods, and settlement obligations.",
        "What happens if financing is not approved later? If a mortgage or financing facility will be required to complete the purchase, understand the consequences of failing to secure approval.",
        "Who pays service charges, maintenance, insurance, and registration-related costs? These can materially affect the true monthly and total cost of the arrangement.",
        "When and how is the Lease-to-Own contract registered? Registration mechanics should be confirmed with the relevant parties and qualified professionals before funds are committed.",
      ]},
      { heading: "Rent-to-Own vs. Traditional Renting vs. Mortgage Purchase", paragraphs: [
        "Traditional rent has no automatic ownership path and is a pure rent expense, with usually higher flexibility and the main risk being rent paid without ownership.",
        "Rent-to-own is built around a potential ownership path, with payments that may combine rent, purchase credits and/or financing components — flexibility depends heavily on the cancellation terms, and the main risk is complex terms or failure to complete the purchase.",
        "A mortgage purchase gives immediate ownership with bank financing, a down payment and purchase costs upfront, and lower flexibility after purchase due to financing and transaction costs — the main risk being financing obligations and property-market exposure.",
      ]},
      { heading: "Costs Buyers Should Look Beyond", paragraphs: [
        "A lower initial payment does not automatically make a rent-to-own property cheaper. Buyers should calculate the entire expected cost over the agreed term, including upfront booking or commitment amounts, monthly or periodic lease payments, any purchase-price credits included in those payments, Dubai Land Department and registration-related fees, service charges and building/community costs, maintenance and insurance responsibilities, financing costs if a bank or other financing party is involved, and any final settlement or balloon payment.",
        "DLD's current Lease-to-Own registration service publishes transaction-specific fees and documentation requirements. Because fees and procedures can change and different structures may be treated differently, buyers should verify the latest official requirements for the specific transaction before signing.",
      ]},
      { heading: "Potential Advantages and Risks", paragraphs: [
        "Potential advantages: a defined route toward homeownership while living in the property; spreading the journey toward purchase across a longer period; suiting buyers expecting stronger future liquidity or financing eligibility; and the chance to experience the property and community before final ownership, depending on contract terms.",
        "Potential risks: the total cost can be higher than expected once all fees and payment components are included; some upfront amounts or payment credits may be lost if the purchase is not completed; a fixed future purchase price may become less competitive if market values fall; the buyer may still need mortgage approval or a large final payment later; contract wording can be more complex than a normal tenancy, so independent legal review is important; and availability is limited compared with the wider Dubai sale and rental market.",
      ]},
      { heading: "Who Might Consider a Rent-to-Own Property?", paragraphs: [
        "A lease-to-own arrangement may be worth exploring for buyers who have stable income, want to remain in Dubai for the medium to long term, prefer a gradual route to ownership, and have a realistic plan for completing the purchase when required. It may be less suitable for someone who expects to relocate soon, needs maximum rental flexibility, is uncertain about future financing, or has not compared the deal against conventional mortgage and off-plan alternatives.",
      ]},
      { heading: "How to Evaluate a Rent-to-Own Opportunity", paragraphs: [
        "Compare the agreed purchase price with similar properties in the same community. Calculate the full cash outflow until ownership — not only the first-year cost. Confirm exactly which payments reduce the purchase balance. Review exit, default, cancellation, and financing-failure clauses. Verify ownership, project/property status, and applicable registration process. Compare the same property objective against a mortgage, ready property, and off-plan alternative. Obtain appropriate legal and financial advice before signing a binding agreement.",
      ]},
    ],
    faqs: [],
    disclaimer: "This article is for general informational purposes only and does not constitute legal, financial, mortgage, tax, or investment advice. Lease-to-own terms, fees, registration requirements, and financing conditions vary by transaction and may change. Buyers should verify current requirements with Dubai Land Department and obtain professional advice before entering into any binding agreement. Official reference: Dubai Land Department — Lease To Own Registration Application, dubailand.gov.ae (accessed August 2026).",
  },

  {
    slug: "short-term-vs-long-term-rental-dubai",
    category: "Blog",
    date: "August 2026",
    title: "Short-Term vs Long-Term Rental in Dubai: Which Actually Earns You More in 2026?",
    excerpt: "The real answer depends on numbers most owners never run — the occupancy rate you'd need to break even, the permit and compliance costs, and how much of your gross income actually survives the journey to your account.",
    heroImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1800&q=90",
    sections: [
      { heading: "The Honest Headline", paragraphs: [
        "One thing worth saying upfront: Golden Key operates both models. Long-term management sits with Golden Key Real Estate, and short-term holiday homes with our sister company, Vibrant Vacation Homes Rental. We have no reason to steer you toward one, because we run both.",
        "Short-term letting typically produces higher gross income than an annual lease on a well-located, well-presented property. It also produces meaningfully higher costs, more variable income, and a genuine operational burden. Published figures generally put short-term gross yields in prime Dubai areas somewhere between 8% and 12%, against roughly 5% to 8% for long-term leases — treat the top of any such range with caution, since it usually describes a well-run property in a strong location during a good year, not an average outcome.",
        "The more useful framing: most Dubai properties need to run at roughly 55% to 65% occupancy to beat what the same unit would earn on an annual lease. Below that, long-term wins. Comfortably above it, short-term wins. That single threshold decides more cases than any yield comparison.",
      ]},
      { heading: "Long-Term Leasing: What It Actually Looks Like", paragraphs: [
        "Annual leasing in Dubai is a well-understood, well-regulated business, and its appeal is precisely that it is boring. As of August 2026, median annual apartment rents ran approximately AED 190,000 on Palm Jumeirah, AED 115,000 in Dubai Creek Harbour, AED 113,000 in Dubai Marina, AED 105,000 in Dubai Hills Estate, AED 85,000 in Business Bay, AED 70,000 in Dubai South and AED 64,000 in JVC — district medians across all unit sizes, so treat them as a frame rather than a quote.",
        "Long-term is efficient. Costs are management fees, service charges, occasional maintenance, and the letting commission when you re-let — no cleaning, no linen, no consumables, no guest support, no platform commission.",
        "Tenancies are registered through Ejari. Rent increases at renewal are capped under Decree No. 43 of 2013, with the permitted increase running from zero — where the rent sits within 10% of the market rate — up to 20% where it sits more than 40% below. Any change to the contract requires 90 days' written notice before expiry. That rent cap is the main structural weakness of long-term leasing from an owner's perspective, since a sitting tenant's rent can only rise so fast — but it is also the reason your tenant stays, which is worth something.",
        "Your exposure is vacancy and tenant quality, and both are manageable — an empty month is expensive, a bad tenant is more expensive, but neither is unpredictable in the way short-term seasonality is. Payment structures have also loosened: the Dubai Land Department launched Flexi Rent in June 2026, allowing tenants renting through participating companies to pay monthly or quarterly rather than in a small number of large cheques, with the total rent unchanged — widening the tenant pool without reducing income.",
      ]},
      { heading: "Short-Term Letting: What It Actually Looks Like", paragraphs: [
        "Short-term rental in Dubai is a licensed hospitality business, not a lease with extra steps. Any residential property let for stays under one year requires a holiday home permit from the Department of Economy and Tourism (formerly DTCM) — there is no exemption and no grace period, each unit needs its own permit, and the permit number must be displayed on the listing.",
        "Reported costs put initial registration at approximately AED 1,520 per property, with annual permit fees running from around AED 370 for a one-bedroom up to roughly AED 1,270 for larger units, and higher figures quoted for villas — fee schedules change, so confirm current rates with DET. Operating without a permit carries fines starting at AED 5,000 and escalating substantially for repeat offences.",
        "Ongoing compliance includes collecting Tourism Dirham from guests at AED 10 per occupied bedroom per night for a Standard classification, or AED 15 for Deluxe, applying to the first 30 consecutive nights of any stay and reported/remitted to DET by the 15th of each month. A Dubai Municipality fee applies to booking revenue, and VAT registration becomes mandatory once taxable turnover exceeds AED 375,000 in any twelve-month period (voluntary from AED 187,500). Guest registration with DET is the most actively enforced requirement, and enforcement has tightened through 2026.",
        "Not every Dubai building permits short-term letting, and owners' association rules can override your intentions entirely — establish this before you spend anything on furniture. Furnishing to a lettable standard typically runs somewhere between AED 30,000 and AED 80,000 depending on unit size and presentation. Dubai's strong season runs roughly October to April; summer is genuinely quiet, so any annual projection built on peak-season rates is fiction.",
      ]},
      { heading: "The Numbers That Decide It", paragraphs: [
        "A worked illustration: take a Dubai Marina one-bedroom. On an annual lease it might achieve somewhere around AED 110,000 to AED 130,000 gross, with running costs low and income certain. On short-term, published operating costs for a comparable unit run roughly AED 45,000 to AED 70,000 a year before the mortgage — cleaning, linen, consumables, utilities, platform commission, permit and management. To beat the lease meaningfully, that unit needs to gross well above AED 180,000, which requires both strong nightly rates and occupancy holding through the summer. Some Marina units do that comfortably; many do not. The difference is location within the community, building facilities, floor, view and — more than owners expect — the quality of the photography and the review score.",
      ]},
      { heading: "Which Suits Your Property?", paragraphs: [
        "Short-term is likely the better fit if your property sits in an area with genuine tourist, leisure or business-travel demand (Marina, Downtown, Palm Jumeirah, JBR, Business Bay), is a studio, one-bedroom or two-bedroom in a building with a pool and gym, is furnished or you're prepared to furnish it properly, is somewhere you'd like to use yourself part of the year, and sits in a building that permits short-term letting.",
        "Long-term is likely the better fit if your property is in a residential community with limited visitor demand, is a three-bedroom or larger or a family villa, is in a building where short-term letting isn't permitted, is unfurnished and you'd rather not spend to change that, is owned purely as an investment you never intend to use, or needs the income to be predictable because a mortgage depends on it.",
        "The overlooked middle option: you don't have to choose permanently. Owners switch between the two as circumstances change. One mechanical note — licensed holiday homes are exempt from Ejari, but if you move a property to a long-term arrangement of six months or more, the tenancy must be registered in Ejari within 30 days. Running a long-term let under a holiday home permit is a violation.",
      ]},
      { heading: "The Question Most Owners Get Wrong", paragraphs: [
        "Owners tend to compare gross short-term income against gross long-term income, and short-term wins every time on that basis. It is the wrong comparison. Compare net income against effort and risk instead: a property earning AED 175,000 gross on short-term with AED 60,000 in costs nets AED 115,000, with income that varies month to month and requires either your time or a management fee. The same property at AED 120,000 on an annual lease nets close to AED 110,000, arrives predictably, and asks nothing of you.",
        "At that point the decision is not really about money. It is about whether you want flexibility and upside, or certainty and quiet. Both are legitimate answers, and the right one depends on you rather than on the property.",
      ]},
    ],
    faqs: [
      { question: "Do I need a licence for short-term letting in Dubai?", answer: "Yes. Any residential property let for stays under one year requires a holiday home permit from the Department of Economy and Tourism. Each unit needs its own permit, and the number must appear on the listing." },
      { question: "What is the Tourism Dirham?", answer: "A per-night charge collected from guests — AED 10 per occupied bedroom for Standard classification, AED 15 for Deluxe — applying to the first 30 consecutive nights and remitted to DET monthly." },
      { question: "Will short-term earn me more?", answer: "Over a strong year, a well-located and well-presented property usually does. It also costs more to run and the income is variable. The practical test is whether the property can sustain roughly 55% to 65% occupancy across the year, including summer." },
      { question: "Can my building stop me letting short-term?", answer: "Yes. Not all buildings permit it, and owners' association rules can override your plans. Confirm this before spending on furnishing." },
      { question: "Can I switch between the two?", answer: "Yes. If you move to a long-term arrangement of six months or more, register the tenancy in Ejari within 30 days." },
      { question: "What's the busiest season?", answer: "Roughly October to April. Summer is materially quieter, and any projection built only on peak-season rates will overstate your annual income." },
    ],
  },

  {
    slug: "rera-registered-broker-dubai",
    category: "Blog",
    date: "August 2026",
    title: "Why You Should Only Buy Dubai Property Through a RERA-Registered Broker — And How to Check in Three Minutes",
    excerpt: "Anyone can call themselves a property consultant in Dubai. Only a registered broker can legally act as one — here's what registration actually means, and how to verify someone before you send a single dirham.",
    heroImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1800&q=90",
    sections: [
      { heading: "What RERA Registration Actually Is", paragraphs: [
        "The Real Estate Regulatory Agency is the regulatory arm of the Dubai Land Department. It licenses brokerages, registers individual brokers, maintains the transaction records that underpin property valuations, and operates the rules that govern how sales and tenancies are conducted in the emirate.",
        "For a broker to operate legally in Dubai, two things must be in place: the company needs a valid trade licence from the Department of Economy and Tourism and an Office Registration Number issued by RERA, and the individual needs a Broker Registration Number (BRN), issued personally after completing certified training through the Dubai Real Estate Institute and passing the associated examination. The registration is renewed annually and carries a physical broker card showing the agent's name, photograph and BRN.",
        "An agent without a BRN is not a junior colleague working towards one. They are operating outside the regulatory framework entirely, and any transaction they handle sits outside it with them.",
      ]},
      { heading: "How to Verify a Broker in Three Minutes", paragraphs: [
        "Check the permit number on the listing — every legitimate property advertisement in Dubai must display a Trakheesi permit number, and a listing with none is not authorised.",
        "Verify the BRN — ask the agent directly for their Broker Registration Number, then check it against the Dubai Land Department's public records through the Dubai REST app or the DLD website. The record confirms the name attached to the number and the brokerage they are registered under.",
        "Confirm the agent matches the brokerage — a valid BRN registered to a different company than the one the agent claims to represent is a red flag worth stopping over.",
        "Ask to see the broker card — registered agents carry one and will produce it without hesitation. Reluctance here tells you something. Any professional will answer these questions in a minute without taking offence.",
      ]},
      { heading: "What Registration Gives You", paragraphs: [
        "A documented, enforceable transaction — Dubai's property transactions run on standardised forms, and a registered broker uses them as a matter of course. Form A records the agreement between a seller and the listing broker, Form B records the agreement between a buyer and their broker, Form F is the Memorandum of Understanding (the sale contract between buyer and seller, setting out the price, deposit, timeline and consequences of non-completion), and Form I governs the arrangement when two brokerages co-operate on a deal.",
        "Accountability that has teeth — registered brokers can be complained about, investigated, fined, suspended and struck off. An unregistered agent has no registration to lose, so your recourse is limited to general legal channels rather than a regulator with direct authority.",
        "Access to actual transaction data — a registered brokerage works from the Dubai Land Department's recorded transaction data — what properties in a specific building actually sold and let for — rather than from portal asking prices. The gap between the two is significant and consistently in one direction.",
        "Correct handling of your money — payments should never go to an agent's personal account. For an off-plan purchase, payments go into the project's escrow account; for a secondary purchase, funds move through the trustee office at transfer, typically by manager's cheque. An agent directing you to transfer a deposit to a personal or unrelated company account is the single clearest warning sign in this market.",
        "Knowledge of the parts that catch buyers out — the developer's No Objection Certificate before a resale can proceed, Oqood registration for off-plan units, the DLD transfer fee (generally 4% of the purchase price plus administrative charges) and who pays it, service charge liabilities that transfer with the property, and the difference between freehold and leasehold zones.",
        "Fee transparency — registered brokers operate under a code of conduct requiring disclosure of commissions, fees and contract terms. Sales commission commonly sits around 2% of the purchase price plus VAT, and leasing commission around 5% of annual rent plus VAT, though these are market conventions rather than fixed rates and are negotiable — the figure should be stated in writing before you commit.",
      ]},
      { heading: "Warning Signs Worth Acting On", paragraphs: [
        "No Trakheesi permit number on the listing. Reluctance or delay when asked for a BRN. A request to transfer a deposit to a personal account. Pressure to decide immediately because a unit is \"about to go\". Refusal to put the commission figure in writing. A property advertised well below comparable transactions with a vague explanation. No Form F, or a suggestion that the paperwork can follow the payment — paperwork follows payment in exactly one type of transaction, and it is not a legitimate one.",
      ]},
      { heading: "The Case for Registration in Plain Terms", paragraphs: [
        "Dubai's property market is one of the most active in the world, and it attracts a corresponding volume of people looking to work its edges. The regulatory framework here is genuinely good — escrow protection, standardised contracts, a public transaction record, a dedicated dispute centre — but it only protects the transactions conducted inside it. A deal arranged by an unregistered agent, documented informally, with money moving through the wrong account, is a deal that has stepped outside the framework.",
        "Verifying a broker takes three minutes. A property purchase is likely the largest transaction you will make this decade. The arithmetic is not close.",
      ]},
    ],
    faqs: [
      { question: "What is a BRN?", answer: "A Broker Registration Number, issued by RERA to an individual broker after certified training and examination. It is personal to the agent, renewed annually, and verifiable through the Dubai REST app or the DLD website." },
      { question: "How do I check whether an agent is registered?", answer: "Ask for their BRN and check it against Dubai Land Department records via the Dubai REST app. You can also ask to see their broker card, which registered agents carry." },
      { question: "What is a Trakheesi permit number?", answer: "The advertising permit that must appear on every legitimate property listing in Dubai. A listing without one is not authorised." },
      { question: "What is Form F?", answer: "The Memorandum of Understanding between buyer and seller, setting out price, deposit, timeline and the consequences of non-completion. It is the core contract in a Dubai property sale." },
      { question: "Where should my deposit go?", answer: "Into the project escrow account for an off-plan purchase, or through the trustee office at transfer for a secondary purchase. Never into an agent's personal account." },
      { question: "How much is the DLD transfer fee?", answer: "Generally 4% of the purchase price plus administrative fees. Who pays it is a matter of agreement between buyer and seller, so establish it before you sign." },
      { question: "Can a non-UAE national buy property in Dubai?", answer: "Yes, on a freehold basis in designated freehold areas, with full ownership rights and no requirement for a local partner. Outside those areas, ownership structures differ." },
      { question: "What if something goes wrong with a registered broker?", answer: "Complaints can be raised with RERA and the Dubai Land Department, and rental matters go to the Rental Dispute Centre. Registered brokers face real consequences, which is the point of registration." },
    ],
  },

  {
    slug: "renewing-dubai-tenancy-2026",
    category: "Blog",
    date: "August 2026",
    title: "Renewing Your Dubai Tenancy in 2026: Rent Caps, Cheques and What to Check Before You Sign",
    excerpt: "There is a formula that decides how much your landlord can legally raise your rent, a notice period they have to respect, and new ways to pay that did not exist a couple of renewal cycles ago. It only works if you know it exists before the renewal notice lands.",
    heroImage: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1800&q=90",
    sections: [
      { heading: "Where the Dubai Rental Market Stands Right Now", paragraphs: [
        "Dubai's leasing market is running at record volume, and the composition of that volume is the interesting part. In July 2026, roughly 38,200 rental contracts were registered across the emirate — around 18,400 new agreements and around 19,800 renewals, taking the total for the first seven months of the year past 214,000 contracts, up slightly on the same stretch last year.",
        "The first quarter told the same story more emphatically: about 118,400 new contracts against 135,600 renewals, with total contract value near AED 32.2 billion. A market where renewals lead is a market where people are settling — Dubai's resident population passed 4.7 million by the end of July, having added more than 160,000 people since January, and most of them are staying where they land. One-bedroom apartments continue to anchor everything, accounting for roughly 41% of all tenancy contracts registered this year.",
      ]},
      { heading: "Why Staying Put Usually Costs Less Than Moving", paragraphs: [
        "When you renew, your increase is limited by law. When somebody new signs a lease on an identical unit down the corridor, there is no cap at all — they pay whatever the market will bear on the day. Over two or three years, those two prices drift apart. DLD figures from mid-2026 make the gap concrete: in Dubai Marina, the median new contract was AED 128,000 against a median renewal of AED 115,000; on Palm Jumeirah, AED 225,000 against AED 195,000. Across the wider market in July 2026, new contracts were priced at roughly AED 91 per square foot per year against roughly AED 75 per square foot on renewals — a gap of around 20%.",
        "That gap is your leverage, and it is also your warning. If you move, you give up an accumulated discount and reset to today's price. Sometimes that still makes sense, but it should be a calculation, not an impulse.",
      ]},
      { heading: "How Much Can Your Landlord Actually Increase the Rent?", paragraphs: [
        "Rent increases at renewal are governed by Decree No. 43 of 2013. The permitted increase depends entirely on how far below the average market rate your current rent sits: less than 10% below market means no increase is permitted at all; 11-20% below allows up to 5%; 21-30% below allows up to 10%; 31-40% below allows up to 15%; and more than 40% below allows up to 20%.",
        "The market rate comes from the RERA Smart Rental Index, built from registered transaction data for your building, community and unit type. The rental increase calculator is available on the Dubai REST app and the DLD website and takes about two minutes to run. If your current rent is within 10% of the index figure for your unit, your landlord is not entitled to any increase — regardless of what similar units are listed at. If a proposed increase exceeds the band you fall into, the excess is not enforceable.",
      ]},
      { heading: "The 90-Day Rule", paragraphs: [
        "If either party wants to change anything about the tenancy at renewal — the rent, the duration, the payment structure, any term at all — they must give the other party written notice at least 90 days before the contract expires. If that notice is not served in time, the tenancy renews on exactly the same terms it ran on before.",
        "This cuts both ways, and tenants forget it more often than landlords do. If you want to negotiate the rent down, change from four cheques to twelve payments, or shorten the term, you also need to raise it inside that window. Diarise the date — ninety days before your contract ends is the moment the renewal actually begins.",
      ]},
      { heading: "Cheques, Instalments and the End of the Four-Cheque Default", paragraphs: [
        "For years, the practical cost of renting in Dubai was the shape of the payment as much as the rent itself. That is changing fast in 2026. Splitting rent across four, six or twelve cheques is now common practice, particularly in communities with plenty of comparable stock — landlords understand that a month of vacancy costs far more than the inconvenience of extra payments.",
        "In June 2026 the Dubai Land Department launched Flexi Rent, a framework allowing tenants renting through participating companies to pay monthly, quarterly or semi-annually instead of in a small number of large cheques. It launched with twelve real estate companies signed on and applies to both new and renewed contracts — the total annual rent does not change, only the shape of payment. It is not automatic and not universal; it depends on whether the company managing your property participates.",
        "DLD has also been preparing a further scheme, reported for launch around September 2026, under which a participating bank would pay the landlord the full annual rent upfront while the tenant repays the bank in up to twelve interest-free instalments — eligibility criteria, participating banks and the application process were still being finalised at the time of writing.",
      ]},
      { heading: "What to Check Before You Renew", paragraphs: [
        "Run the RERA calculator to find out exactly where your current rent sits against the index for your specific unit type, size and community. Confirm the notice was valid — was it in writing, and did it arrive at least 90 days before expiry? Compare against live listings carefully, since advertised asking prices are not the same as achieved rents. Check what has been delivered nearby, since a wave of new handovers shifts the balance of negotiating room. Price the alternative properly — moving is not just the rent difference, but the security deposit, agency commission, Ejari registration, a DEWA deposit, movers, and any period of double-paying. Finally, decide what you actually want: a lower rent, more instalments, a resolved maintenance issue, or a longer fixed term — landlords respond better to one clear ask than to general dissatisfaction.",
      ]},
      { heading: "If Your Landlord Asks for More Than the Cap Allows", paragraphs: [
        "Start with the calculator result rather than an argument — in many cases the landlord has estimated the increase from asking prices in the building and simply has not run the index. If it does not resolve, the Rental Dispute Centre exists precisely for this; filing costs a percentage of your annual rent, and your position rests on documentation — your registered Ejari, your written tenancy contract, the notice you received and its date, and the index result.",
        "Notice for eviction is a separate matter with a different rule: a landlord seeking to end a tenancy for reasons such as sale, personal use, or major renovation must serve twelve months' notice through a notary public. That is not the same as a renewal notice, and the two should not be confused.",
      ]},
      { heading: "Keep Your Ejari Current", paragraphs: [
        "Ejari is the registration that makes your tenancy official with RERA and the Dubai Land Department, and it is what makes your rights enforceable. Without a valid Ejari you cannot activate or maintain a DEWA account, sponsor family residency using your tenancy, or bring a case to the Rental Dispute Centre. As of August 2026, DLD listed the cost at AED 177.75 through the Dubai REST app or approximately AED 220 at a Real Estate Services Trustee centre.",
      ]},
    ],
    faqs: [
      { question: "How much can my landlord raise my rent in Dubai?", answer: "It depends on how far your current rent sits below the market rate for your unit. The permitted increase runs from zero, where your rent is less than 10% below market, up to 20% where it is more than 40% below. Check the exact figure using the RERA rental increase calculator on the Dubai REST app." },
      { question: "What is the RERA Smart Rental Index?", answer: "It is the official benchmark that determines the market rate for your property, built from registered transaction data for your building, area and unit type. It is what the rent increase cap is measured against." },
      { question: "Can my landlord refuse to renew my tenancy?", answer: "Only for specific reasons permitted under Dubai's tenancy law — including sale of the property, the owner's personal use, or major renovation — and only with twelve months' written notice served through a notary public." },
      { question: "How many cheques can I ask for?", answer: "There is no legal limit. Four, six and twelve cheque arrangements are all common. In areas with high availability, additional cheques are often one of the more achievable concessions." },
      { question: "What is Flexi Rent?", answer: "A Dubai Land Department framework launched in June 2026 that allows tenants renting through participating companies to pay monthly, quarterly or semi-annually rather than in a small number of large cheques. The total annual rent stays the same. Availability depends on whether the company managing the property takes part." },
      { question: "What happens if my landlord misses the 90-day notice?", answer: "The tenancy renews automatically on the same terms as the existing contract, including the same rent." },
      { question: "How much is the security deposit in Dubai?", answer: "Typically 5% of the annual rent for an unfurnished property and 10% for a furnished one. It is refundable at the end of the tenancy, subject to the condition of the property." },
      { question: "Do I need to renew my Ejari every year?", answer: "Yes. Ejari should be renewed against each new contract. Without a current registration you may face problems with DEWA, visa processes and any dispute you need to bring." },
    ],
  },

  {
    slug: "business-bay-community-update-august-2026",
    category: "Community Update",
    date: "August 2026",
    title: "Business Bay Community Update: August 2026",
    excerpt: "The road network around Business Bay kept improving in stages, and the rental market held completely flat — a more interesting result than it sounds, given how much new stock is heading this way.",
    heroImage: "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1800&q=90",
    sections: [
      { heading: "Construction, Infrastructure & Connectivity", paragraphs: [
        "Two separate RTA programmes are reshaping how you get in and out of Business Bay. The Oud Metha and Al Asayel Streets project — part of the wider Sheikh Rashid Corridor development — reached around 90% completion. A three-lane bridge opened in late July carrying traffic from Al Khail Road towards Al Asayel Street, with capacity for 3,600 vehicles per hour, joining two earlier bridges for a combined 9,000 vehicles per hour across separate movements. Two tunnels were scheduled to follow by the end of August. The full scheme covers four major intersections, 4.3 kilometres of bridges and tunnels, and 14 kilometres of new and widened roads, and RTA expects it to serve more than 420,000 residents by 2030.",
        "The Al Mustaqbal Street project connects the district to DWTC, DIFC and Downtown. The AED 633 million scheme opened a 500-metre bridge from DWTC and One Central, cutting the run to Al Mustaqbal Street from around ten minutes to two during major events. The corridor is being widened from three lanes to four in each direction, lifting capacity from 6,600 to 8,800 vehicles per hour and cutting journey times from 13 minutes to six — construction has passed the halfway mark, ahead of programme. For residents, the eastern and northern approaches to Business Bay are getting materially better in stages through to early 2027.",
      ]},
      { heading: "The Business Bay Property Market", paragraphs: [
        "Business Bay was flat in August, and flat is worth explaining. Apartment contracts registered with an August start date put the district's median annual rent unchanged at approximately AED 85,000, across a deep sample of more than 1,000 contracts. Rent per square foot rose slightly, by around 1.9% to roughly AED 107.",
        "Holding flat is a reasonable outcome given Business Bay carries more supply pressure than almost anywhere else in Dubai — it is one of five districts that between them hold close to 45% of the emirate's under-construction stock, with roughly 10,000 new residential units projected to enter the district by 2027, around two-thirds of it studios and one-bedrooms. The counterweight is demand: in July, Business Bay generated more aggregate annual rental contract value than any other Dubai district, at approximately AED 384 million, ahead of Downtown Dubai at around AED 315 million.",
        "Current rent ranges: studios generally run from around AED 55,000 (older Executive Towers stock at the lower end, branded residences above AED 85,000); one-bedrooms span roughly AED 75,000 to AED 140,000 depending on canal view, floor and building age; two-bedrooms sit around AED 110,000 to AED 200,000. District cooling typically adds AED 5,000 to AED 12,000 a year on top of the headline rent. On the sales side, Business Bay averages somewhere in the region of AED 1,450 to AED 2,360 per square foot depending on building and view, with the typical apartment transaction landing around AED 1.5 million. Business Bay spans roughly 240 towers across two clearly different generations — older office-conversion stock and newer branded residential — and they do not price alike or let alike.",
      ]},
      { heading: "Handovers & Off-Plan Activity", paragraphs: [
        "The Q4 handover schedule is the thing to watch. Binghatti Skyrise is the largest single event — three towers carrying in the region of 3,300 residential units plus retail, targeted for Q4 2026, which will be felt particularly in the studio and one-bedroom segment. Peninsula by Select Group continues its phased delivery, a waterfront masterplan of around one million square feet across five sub-developments running in stages from 2026 through 2028, and is the most coherent piece of placemaking in Business Bay.",
        "Also in the 2026 handover window: Volta and Cavalli Tower from DAMAC, Bayz 101 from Danube, and the first phase of Binghatti's Mercedes-Benz project. Looking to 2027, the ultra-prime pipeline includes Omniyat's Dorchester Collection and Vela Viento, alongside Peninsula 6. If you own a studio or one-bedroom here and your tenancy expires around the turn of the year, start the renewal conversation early — you will be competing against brand-new units at the exact moment the Q4 handovers complete.",
      ]},
      { heading: "Community, Retail & Lifestyle", paragraphs: [
        "Dubai Summer Surprises ran through to the end of August, keeping Bay Avenue and the district's malls and restaurants busier than the season would normally allow. Business Bay's transformation from an office district to a live-work neighbourhood continues to show in its food and beverage mix — the stretch along the Dubai Water Canal and around Bay Avenue now supports genuine weekend footfall rather than emptying out after the working day.",
      ]},
      { heading: "What Residents Are Talking About", paragraphs: [
        "Traffic and parking remain the standing complaints, particularly around the internal roads and the exits onto Al Khail Road at peak. Maintenance and building management come up repeatedly in tenant feedback, and the variance between towers is wide — in a district with this much choice, it directly affects what a landlord can achieve. Among owners, the Q4 handover wave is the dominant conversation, and reasonably so.",
      ]},
      { heading: "Looking Ahead", paragraphs: [
        "Watch three things through the rest of the year: the October bridge on the Al Mustaqbal corridor, the Q4 handover completions and what they do to studio and one-bedroom availability, and whether the district's flat rental read holds once that stock is actually on the market. The leasing season also strengthens from September as corporate relocations resume after summer.",
      ]},
    ],
  },

  {
    slug: "damac-hills-community-update-august-2026",
    category: "Community Update",
    date: "August 2026",
    title: "DAMAC Hills Community Update: August 2026",
    excerpt: "August delivered the thing DAMAC Hills residents have been waiting on for two years: the Al Qudra Road intersection finally works.",
    heroImage: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1800&q=90",
    sections: [
      { heading: "Construction, Infrastructure & Connectivity", paragraphs: [
        "On 9 August the RTA opened a four-lane, 700-metre bridge on the southern side of the junction between Al Qudra Road and Sheikh Zayed bin Hamdan Al Nahyan Street, carrying up to 6,000 vehicles per hour. It completes the pair with a matching bridge that opened back in February, meaning the main traffic configuration at that intersection is finished.",
        "The numbers are worth reading properly: capacity at the junction rises from 7,800 vehicles per hour to 19,400, and waiting time falls by around 85%, from close to seven minutes down to roughly one. Across the wider Al Qudra Road Development Project, RTA puts the journey time reduction at 9.4 minutes to 2.8 minutes, across a corridor serving more than 400,000 residents and visitors, including Arabian Ranches 1 and 2, Motor City, Studio City, Mudon, The Sustainable City and DAMAC Hills 2.",
        "There is more coming — RTA has said the side ramp bridges at the same intersection are due in Q4 2026, including a 500-metre bridge towards Jebel Ali and a 900-metre bridge towards Downtown Dubai and Dubai International Airport, plus three kilometres of service roads. So the improvement felt in August is not the finished article; the directional movements that decide whether your morning run to the city is smooth arrive with the ramps later this year.",
      ]},
      { heading: "The Property Market in DAMAC Hills", paragraphs: [
        "DAMAC Hills read softer than the Dubai average in August, placing it in the same group as JVC and Dubai Hills Estate, while Dubai Marina, Palm Jumeirah and Dubai South read firmer and Business Bay and Dubai Creek Harbour were broadly flat. That split is the defining feature of Dubai's 2026 rental market — there is no single citywide direction any more.",
        "For owners, pricing to let matters more than it did a year ago, because a tenant comparing your unit against several similar ones will move on quickly from an ambitious asking price — a month of vacancy costs considerably more than a modest reduction. For tenants, it means a renewal is genuinely worth checking against the RERA Smart Rental Index, since in a softer-reading community there is a reasonable chance no increase is permitted at all.",
        "On yields, DAMAC Hills continues to hold up as an income play rather than an appreciation one — apartments have generally been producing gross yields in the region of 6% to 7%, with three and four-bedroom villas typically lower but considerably more stable. On the sales side, asking-price data puts apartments averaging roughly AED 629,000 for a studio, AED 1.13 million for a one-bedroom and AED 2.08 million for a two-bedroom; villa averages run from around AED 4.36 million for a three-bedroom to AED 5.28 million for a four-bedroom, with Trump Estates and premium golf-facing plots pulling up the top of the range.",
      ]},
      { heading: "Retail, Amenities & Resident Sentiment", paragraphs: [
        "No new cafés, restaurants, gyms or amenities opened within DAMAC Hills in August. DAMAC Mall remains the community's day-to-day retail anchor, with around 40 retail units and ten food and beverage outlets alongside its Spinneys and Fitness First — adequate rather than generous for a community of this size. Trump International Golf Club Dubai remains the community's defining amenity, with a meaningful share of villas facing fairway or water rather than the course being a members-only edge to the masterplan.",
        "Paid parking is still the sore point — Parkin's metered zone across DAMAC Hills (code 676H) came in during May and has not been reconsidered, running from AED 2 for thirty minutes up to AED 16 for four hours, Monday to Saturday, 8am to 10pm, with subscriptions from AED 300 a month. Residents' objection has never really been the amount; it is that a gated, master-planned community that markets itself on space is now metered like a city-centre district. The bridge, by contrast, is the clearest, most concrete improvement the community has received in some time, and reaction has been correspondingly positive.",
      ]},
      { heading: "Looking Ahead", paragraphs: [
        "Two things to watch through the rest of the year: the Q4 ramp openings at the Al Qudra intersection, which complete the works that began in February, and the leasing season picking up from September through the end of the year as families settle after the school intake and corporate relocations resume — a window that matters more than usual for owners with a vacant unit in a community reading softer.",
      ]},
    ],
  },

  {
    slug: "downtown-dubai-community-update-august-2026",
    category: "Community Update",
    date: "August 2026",
    title: "Downtown Dubai Community Update: August 2026",
    excerpt: "Downtown is the one Dubai district where the summer slowdown barely registers. The property picture is the more interesting story this month, and it needs reading carefully rather than at face value.",
    heroImage: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=1800&q=90",
    sections: [
      { heading: "The Downtown Property Market", paragraphs: [
        "Downtown's rental data in August came with a caveat worth understanding: the mid-month read of Ejari and Dubai Land Department records carried a shorter registration cutoff for Downtown than for other districts, producing an apparent decline that should not be compared directly against areas measured over a longer window.",
        "What is more reliable is the direction over a longer period. Asking-price indices have Downtown's rent per square foot at roughly AED 167 as of mid-year, down from around AED 193 six months earlier and AED 187 twelve months earlier. Forecast models covering 2026 put Downtown at approximately -1.4% across the period, alongside Al Barsha at around -1.1% — the clearest examples of softening in the current dataset. The honest read: Downtown is easing gently, a normalisation rather than a correction after four years of hard appreciation.",
        "Two things support that view. Downtown remains the second-largest leasing market in Dubai by contract value, generating approximately AED 315 million in aggregate annual rental contract value in July, behind only Business Bay at around AED 384 million. And unlike Business Bay, JVC or Dubai South, Downtown has very little new supply coming — it is essentially built out, so whatever softening happens here is demand-side and cyclical.",
        "Current rent ranges: studios generally run around AED 75,000 to AED 100,000; one-bedrooms roughly AED 90,000 to AED 130,000; two-bedrooms around AED 150,000 to AED 220,000; three-bedrooms span AED 250,000 to AED 400,000 depending heavily on view and building. District cooling can run AED 800 to AED 1,500 a month through summer. On the sales side, Downtown continues to price at the top of Dubai's apartment market — Burj Vista sits in the region of AED 2,500 to AED 3,400 per square foot, Address Residences stock roughly AED 3,000 to AED 4,800, and Burj Khalifa's standard residential floors approximately AED 3,500 to AED 5,500, with direct Burj-facing units commanding a 10-20% premium over interior-facing stock. Gross yields here typically fall in the 5% to 7% range — Downtown is bought for capital preservation and appreciation, not cash flow.",
      ]},
      { heading: "Retail, Dining & Construction Progress", paragraphs: [
        "The Dubai Mall continues its expansion programme — an AED 1.5 billion scheme will add around 240 luxury retail and dining concepts along with expanded exhibition space. Mandarin Oriental Downtown continues to build out its food and beverage offer, with Billionaire now operating there as a late-night dining and entertainment concept, and Fashion Avenue added L'Avenue, the Paris brasserie, earlier in the year.",
        "Downtown itself is largely finished, so the infrastructure story is about the approaches. The Al Mustaqbal Street Development Project (AED 633 million) is improving connectivity between DWTC, DIFC, Downtown and Business Bay — a 500-metre bridge from DWTC and One Central has opened, and the corridor is being widened from three lanes to four in each direction, lifting capacity from 6,600 to 8,800 vehicles per hour. The World Trade Centre Roundabout project is replacing the roundabout with a signal-controlled intersection, and the Sheikh Rashid Corridor works along Oud Metha and Al Asayel Streets have reached roughly 90% completion. Taken together, the approaches into Downtown from the north and east are measurably better than a year ago.",
      ]},
      { heading: "What Residents Are Talking About", paragraphs: [
        "Traffic is the standing complaint and always has been — Sheikh Zayed Road around the Burj Khalifa interchange remains congested through peak periods, and the internal Boulevard loop backs up badly at weekends and during Fountain show times. Parking follows closely behind, particularly in the older Boulevard towers. Among owners, the conversation is about pricing correctly — Downtown tenants have more choice than they did two years ago, and the gap between a well-presented, correctly priced unit and an ambitiously priced one shows up quickly in days-on-market. Service charges remain high here relative to most of Dubai, the trade-off for the amenity standard and the address.",
      ]},
      { heading: "Looking Ahead", paragraphs: [
        "Three things to watch through the rest of the year: the October bridge completion on the Al Mustaqbal corridor, whether Downtown's softer read firms up as the peak leasing season arrives from September through to March, and the continued build-out of the Dubai Mall expansion, which will keep reshaping the district's retail centre of gravity.",
      ]},
    ],
  },
];

function InsightArticleDetail({ slug }) {
  const article = INSIGHT_ARTICLES.find((item) => item.slug === slug);

  if (!article) {
    return (
      <>
        <Header />
        <main className="page-placeholder">
          <div className="wrap">
            <h1 className="serif">Article not found</h1>
            <a href="/insights" className="button-outline">
              ← Back to Insights
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

        <section className="area-detail-hero">
          <img src={article.heroImage} alt={article.title} />
          <div className="area-detail-hero-overlay" />

          <div className="wrap">
            <p>GOLDEN KEY {article.category.toUpperCase()}</p>
            <h1>{article.title}</h1>
            <span>{article.date}</span>
          </div>
        </section>

        <section className="area-detail-section">
          <div className="wrap area-detail-layout">

            <article className="area-detail-content">
              <p className="area-detail-breadcrumb">
                Insights / {article.category} / {article.title}
              </p>

              <p style={{ fontSize: 17, color: "#42555c" }}>
                {article.excerpt}
              </p>

              {article.sections.map((section) => (
                <div key={section.heading}>
                  <h3>{section.heading}</h3>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ))}

              {article.faqs && article.faqs.length > 0 && (
                <>
                  <h3>Frequently asked questions</h3>
                  <div className="valuation-faq">
                    {article.faqs.map((faq, index) => (
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
                </>
              )}

              {article.disclaimer && (
                <p style={{ fontSize: 12, color: "#8b9296", marginTop: 30 }}>
                  {article.disclaimer}
                </p>
              )}
            </article>

            <aside className="area-detail-sidebar">
              <div className="area-detail-form">
                <p>TALK TO OUR TEAM</p>
                <h3>Have a question about this?</h3>
                <EnquiryForm compact />
              </div>

              <div className="area-guide-side-card">
                <strong>Looking to move?</strong>
                <span>Browse properties available in Dubai.</span>
                <a href="/buy">View properties →</a>
              </div>
            </aside>

          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

function Insights() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = [
    "All",
    "Market Report",
    "Community Update",
    "Blog",
  ];

  const visibleArticles = INSIGHT_ARTICLES.filter(
    (article) =>
      activeCategory === "All" || article.category === activeCategory
  );

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

        {/* CATEGORY FILTER */}
        <section className="insights-list">
          <div className="wrap">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 30 }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cat === activeCategory ? "button-coral" : "button-outline"}
                  style={{ padding: "8px 18px", fontSize: 13 }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="insights-grid">

              {visibleArticles.map((item) => (
                <article
                  className="insights-card"
                  key={item.slug}
                >

                  <p style={{ fontSize: 11, letterSpacing: ".08em", color: "#a58a4f", marginBottom: 8 }}>
                    {item.category.toUpperCase()} · {item.date}
                  </p>

                  <h2>
                    {item.title}
                  </h2>

                  <p>
                    {item.excerpt}
                  </p>

                  <a href={`/insights/${item.slug}`}>
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
      title: "Property Valuation",
      path: "/services/property-valuation",
      text: "Understand the market value of your property with a professional assessment built around location, demand and comparable evidence.",
      image:
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=88",
    },
    {
      title: "Mortgage Services",
      path: "/services/mortgage-services",
      text: "Guidance through pre-approval, first-time purchases, non-resident mortgages, refinancing and equity release.",
      image:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=88",
    },
    {
      title: "Holiday Home Services",
      path: "/services/holiday-home-services",
      text: "Make short-term property ownership easier with guest, marketing and operational support.",
      image:
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=88",
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
  const serviceItems = [
    {
      title: "Rental valuation and pricing strategy",
      text: "Setting a rent that fills the property quickly without leaving money on the table. Priced against what is actually letting nearby, not against optimistic asking prices.",
    },
    {
      title: "Marketing and tenant sourcing",
      text: "Professional photography, listings across the major UAE portals, and viewings handled by our agents rather than by you.",
    },
    {
      title: "Tenant screening",
      text: "Employment, identity, and reference checks before anyone signs. The wrong tenant costs far more than an empty month.",
    },
    {
      title: "Tenancy contracts and Ejari registration",
      text: "Drafted correctly, registered properly, and filed where you can actually find them.",
    },
    {
      title: "Rent collection and cheque handling",
      text: "Rent chased, collected, and transferred to you. Late payment is followed up by us, not by you.",
    },
    {
      title: "Maintenance coordination",
      text: "Vetted contractors, an agreed approval threshold, and jobs seen through to completion rather than just logged.",
    },
    {
      title: "Move-in and move-out inspections",
      text: "Documented with photographs at both ends, so deposit conversations rest on evidence rather than memory.",
    },
    {
      title: "Renewals and re-letting",
      text: "Renewal conversations started early, and marketing restarted before a vacancy rather than after it.",
    },
    {
      title: "Regulatory compliance",
      text: "RERA and Dubai Land Department requirements handled as part of the service, not as an extra you have to remember.",
    },
    {
      title: "Dispute and delinquency support",
      text: "If a tenancy goes wrong, we manage the process and advise you on your options rather than leaving you to work it out alone.",
    },
    {
      title: "Owner reporting",
      text: "A clear record of income, expenses, and what is happening at your property — sent to you rather than waiting to be requested.",
    },
  ];

  const whyCards = [
    {
      number: "01",
      title: "We manage the asset, not just the tenancy",
      description:
        "A managed property should be worth more at the end of a tenancy than a neglected one. Small repairs handled early, condition documented, maintenance recorded — it protects your rent now and your resale value later.",
    },
    {
      number: "02",
      title: "Vacancy is the real cost",
      description:
        "An empty month is far more expensive than a slightly lower rent. We price to let, market before the lease ends, and open renewal conversations early instead of reacting to a notice.",
    },
    {
      number: "03",
      title: "You hear from us before you have to ask",
      description:
        "Owners should not have to chase their own property manager for an update. You will know what is happening at your property — including when something has gone wrong.",
    },
    {
      number: "04",
      title: "Contractors we stand behind",
      description:
        "We use a vetted panel rather than whoever answers the phone first, and we check the work is finished properly before it is signed off and paid.",
    },
    {
      number: "05",
      title: "Overseas owners fully covered",
      description:
        "Many of our landlords do not live in the UAE. Viewings, inspections, maintenance, and handovers all run without you being in the country.",
    },
    {
      number: "06",
      title: "Straight answers about your property",
      description:
        "If your rent expectation is unrealistic, or the property needs work before it will let well, we will tell you. That is more useful than agreement.",
    },
  ];

  const faqs = [
    {
      question: "What does property management actually include?",
      answer:
        "Everything between finding a tenant and the tenancy ending — marketing, screening, contracts and Ejari, rent collection, maintenance, inspections, renewals, and compliance.",
    },
    {
      question: "How much do you charge?",
      answer:
        "Fees depend on the property, the service level, and the size of the portfolio. We set them out in writing in your proposal, with nothing introduced later.",
    },
    {
      question: "What if I already have a tenant in place?",
      answer:
        "That is fine, and common. We can take over an existing tenancy mid-term without disrupting the tenant or the contract.",
    },
    {
      question: "Who pays for repairs?",
      answer:
        "Repair costs are the owner's, as they normally are. We agree a spending threshold with you in advance so routine minor issues get fixed immediately, and we come to you for approval on anything above it.",
    },
    {
      question: "What if I live outside the UAE?",
      answer:
        "Many of our landlords do. Viewings, inspections, maintenance, tenant handovers, and renewals all run without you needing to be in the country.",
    },
    {
      question: "How do you choose tenants?",
      answer:
        "Employment, identity, and reference checks before anyone signs. We would rather leave a property empty for a few extra weeks than place a tenant who will cause problems for a year.",
    },
    {
      question: "How quickly will you find a tenant?",
      answer:
        "It depends on the property, the price, and the season. What we can commit to is pricing it honestly and starting the marketing before the current lease ends rather than after it.",
    },
    {
      question: "What happens if a tenant stops paying?",
      answer:
        "We follow up immediately, keep you informed, and advise you on your options. You are not left to work out the process alone.",
    },
    {
      question: "Do you handle Ejari and renewals?",
      answer:
        "Yes. Registration, renewals, and the associated paperwork are part of the service.",
    },
    {
      question: "Can I still sell the property while it is managed?",
      answer:
        "Yes. Golden Key handles sales as well, so a managed property can be brought to market by the same team, with the tenancy taken into account.",
    },
    {
      question: "Do you manage commercial property?",
      answer:
        "Yes, alongside residential. Tell us what you own and we will confirm what we can take on.",
    },
    {
      question: "What if I want short-term letting instead?",
      answer:
        "Holiday homes and short-term stays are handled by our sister company, Vibrant Vacation Homes Rental. Same ownership and same standards, run as a separate operation because it is a genuinely different business.",
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
              Your property, managed
              <br />
              like we own it
            </h1>

            <p>
              Owning a property in Dubai should feel like an asset, not
              a second job. Golden Key handles the tenants, the rent,
              the maintenance, and the paperwork — so the only thing
              you deal with is the income.
            </p>

            <div className="pm-hero-actions">
              <a
                href="#pm-contact"
                className="pm-gold-button"
              >
                Get a Management Proposal
              </a>

              <a
                href="#pm-overview"
                className="pm-outline-button"
              >
                Talk to Our Team
              </a>
            </div>

            <p className="trust-line">
              Free proposal · No obligation · Overseas owners fully covered
            </p>
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
                THE PROBLEM WE SOLVE
              </p>

              <h2 className="pm-serif">
                Owning is easy.
                <br />
                Managing is the hard part.
              </h2>

              <p>
                Chasing rent. Fielding maintenance calls at inconvenient
                hours. Renewing Ejari before it lapses. Finding a
                replacement tenant the moment one gives notice. Arguing
                about a deposit over damage nobody photographed.
              </p>

              <p>
                None of it is complicated on its own — it is simply
                relentless, and it quietly eats the time you bought the
                property to free up.
              </p>

              <h3>
                That is the entire job we take off your hands.
              </h3>

            </div>

            <div className="pm-form-card reveal">

              <p className="pm-form-label">
                GET IN TOUCH
              </p>

              <h3>
                Tell us about your property
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(
                    "Thank you — we have received your details. A member of our team will be in touch shortly with a proposal for your property."
                  );
                }}
              >

                <input
                  required
                  placeholder="Full name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email address"
                />

                <input
                  required
                  placeholder="Mobile number (+971)"
                />

                <select required defaultValue="">
                  <option value="" disabled>
                    Property type
                  </option>
                  <option>Apartment</option>
                  <option>Villa</option>
                  <option>Townhouse</option>
                  <option>Penthouse</option>
                  <option>Commercial</option>
                  <option>Whole building</option>
                </select>

                <input
                  required
                  placeholder="Community or building"
                />

                <select required defaultValue="">
                  <option value="" disabled>
                    Bedrooms
                  </option>
                  <option>Studio</option>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5+</option>
                  <option>Not applicable</option>
                </select>

                <select required defaultValue="">
                  <option value="" disabled>
                    Number of properties
                  </option>
                  <option>1</option>
                  <option>2–4</option>
                  <option>5+</option>
                </select>

                <select required defaultValue="">
                  <option value="" disabled>
                    Current status
                  </option>
                  <option>Vacant</option>
                  <option>Tenanted</option>
                  <option>Handover soon</option>
                  <option>Currently self-managed</option>
                  <option>Managed elsewhere</option>
                </select>

                <select defaultValue="">
                  <option value="" disabled>
                    Are you based in the UAE?
                  </option>
                  <option>Yes</option>
                  <option>No</option>
                </select>

                <textarea
                  rows="4"
                  placeholder="Anything we should know?"
                />

                <button
                  type="submit"
                  className="pm-gold-button"
                >
                  Send My Details
                </button>

                <p className="form-consent-note">
                  By submitting this form you agree to be contacted by
                  Golden Key Real Estate regarding your property. We
                  never share your details with third parties.
                </p>

              </form>

            </div>

          </div>
        </section>

        {/* WHAT FULL MANAGEMENT COVERS */}
        <section className="section" id="pm-services">
          <div className="wrap">

            <p className="pm-gold-label centered">
              WHAT FULL MANAGEMENT COVERS
            </p>

            <h2 className="pm-serif centered">
              Fully managed, genuinely hands-off
            </h2>

            <p className="section-intro-text centered">
              From the moment your property is ready to lease until the
              day a tenant hands the keys back, we handle the entire
              cycle. You approve the decisions that matter. We take
              care of everything else.
            </p>

            <div className="content-checklist">
              {serviceItems.map((item) => (
                <div className="content-checklist-item" key={item.title}>
                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 36 }}>
              <a href="#pm-contact" className="pm-gold-button">
                Get a Management Proposal
              </a>
            </div>

          </div>
        </section>

        {/* WHY OWNERS CHOOSE GOLDEN KEY */}
        <section className="section pm-report-section">

          <div className="wrap">

            <p className="pm-gold-label centered">
              WHY OWNERS CHOOSE GOLDEN KEY
            </p>

            <h2 className="pm-serif centered">
              Management that behaves like ownership
            </h2>

            <div className="content-cards-grid">
              {whyCards.map((card) => (
                <div className="content-card" key={card.number}>
                  <span className="circle-mark">{card.number}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              ))}
            </div>

          </div>

        </section>

        {/* MULTIPLE PROPERTIES & BUILDING MANAGEMENT */}
        <section className="section pm-explanation">

          <div className="wrap pm-explanation-grid">

            <div className="reveal">

              <p className="pm-gold-label">
                MULTIPLE PROPERTIES & BUILDING MANAGEMENT
              </p>

              <h2 className="pm-serif">
                One property or
                <br />
                an entire building
              </h2>

              <p>
                Landlords with several units, and owners of whole
                buildings, need more than the same service repeated.
                They need it coordinated.
              </p>

              <p>
                <strong>Portfolio management —</strong> multiple units
                handled under one arrangement with consolidated
                reporting, so you are not tracking each property
                separately or repeating the same conversation.
              </p>

              <p>
                <strong>Leasing and vacancy management —</strong>{" "}
                occupancy managed across the portfolio, with lease end
                dates staggered where possible so vacancies do not all
                land in the same month.
              </p>

              <p>
                <strong>Facilities and maintenance supervision —</strong>{" "}
                contractors, common areas, and routine servicing
                overseen on your behalf, with a single point of
                contact.
              </p>

              <p>
                <strong>Fit-out and handover coordination —</strong> new
                units prepared, snagged, and made ready to let without
                you managing the trades yourself.
              </p>

              <p>
                <strong>Financial reporting —</strong> income, expenses,
                and arrears reported across the whole portfolio in one
                place.
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
                  IS LONG-TERM MANAGEMENT RIGHT FOR YOU?
                </p>

                <h2 className="pm-serif">
                  This is likely the
                  <br />
                  right service if you
                </h2>

                <ul>
                  <li>Want predictable annual income without day-to-day involvement</li>
                  <li>Own the property purely as an investment and do not use it yourself</li>
                  <li>Live outside the UAE, or travel frequently</li>
                  <li>Own several units and want them handled consistently</li>
                  <li>Have had a difficult tenancy before and would rather not repeat it</li>
                  <li>Are self-managing now and have run out of patience for it</li>
                </ul>
              </div>

<div className="pm-real-image pm-image-reveal">
  <img
    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=90"
    alt="Luxury property interior"
  />

  <div className="pm-image-overlay">
    <span>Long-term management</span>
  </div>
</div>

            </div>

            <div className="pm-alternate-row reverse reveal">

              <div>
                <p className="pm-gold-label">
                  A DIFFERENT LETTING MODEL
                </p>

                <h2 className="pm-serif">
                  Short-term letting may
                  <br />
                  suit you better if you
                </h2>

                <ul>
                  <li>Own a well-located furnished property in an area with visitor demand</li>
                  <li>Want to use the property yourself during parts of the year</li>
                  <li>Prefer higher potential returns and accept more variable income</li>
                </ul>

                <p>
                  If that list sounds more like you, our sister
                  company, Vibrant Vacation Homes Rental, handles
                  holiday homes and short-term stays. Same ownership,
                  same standards, built for a different letting model.
                  Tell us about the property and we will recommend the
                  right one — including when the honest answer is the
                  service we do not provide.
                </p>

                <a
                  href="/services/holiday-home-services"
                  className="pm-outline-small"
                >
                  Get a Free Recommendation
                </a>

              </div>

<div className="pm-real-image pm-image-reveal">
  <img
    src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=90"
    alt="Professionally maintained property"
  />

  <div className="pm-image-overlay">
    <span>Short-term letting</span>
  </div>
</div>

            </div>

          </div>

        </section>

        {/* HOW IT WORKS */}
        <section className="section pm-testimonials">

          <div className="wrap">

            <p className="pm-gold-label centered">
              HOW IT WORKS
            </p>

            <h2 className="pm-serif centered">
              Getting started takes three steps
            </h2>

            <div className="pm-testimonial-grid">

              <article className="pm-testimonial">
                <strong>Step 01 — Property review</strong>
                <p>
                  Tell us about your property. We look at the unit,
                  its location, its condition, and what comparable
                  properties nearby are actually achieving in rent.
                </p>
              </article>

              <article className="pm-testimonial">
                <strong>Step 02 — Your proposal</strong>
                <p>
                  We come back with a realistic rental figure,
                  anything we would recommend doing before listing,
                  and a clear breakdown of our fees. No obligation to
                  proceed.
                </p>
              </article>

              <article className="pm-testimonial">
                <strong>Step 03 — Onboarding and go live</strong>
                <p>
                  Paperwork, photography, listing, and marketing
                  handled by us. From there your property is managed,
                  and you receive regular updates without having to
                  ask.
                </p>
              </article>

            </div>

          </div>

        </section>

        {/* FAQ */}
        <section className="section pm-dashboard-section">

          <div className="wrap">

            <p className="pm-gold-label centered">
              FREQUENTLY ASKED QUESTIONS
            </p>

            <h2 className="pm-serif centered">
              Your questions, answered
            </h2>

            <div className="valuation-faq" style={{ maxWidth: 820, margin: "30px auto 0" }}>
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
              Let the property earn
              <br />
              without it running your week
            </h2>

            <p>
              Tell us about your property and we will come back with a
              realistic rental figure and a clear proposal. No cost,
              and no obligation to sign.
            </p>

            <a
              href="#pm-overview"
              className="pm-gold-button"
            >
              Get My Management Proposal
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

  // --- PROCESS STEPS DATA (Section 02 of the copy deck) ---
  const processSteps = [
    {
      number: "01",
      title: "Share your property details",
      description:
        "Tell us where your property is, its size, layout, and condition. It takes less than two minutes, and there's nothing to pay.",
      ctaText: "Start My Valuation",
    },
    {
      number: "02",
      title: "Talk to a community specialist",
      description:
        "A Golden Key agent who works your specific community reviews your property, compares it against what's actually selling nearby, and asks the questions a spreadsheet can't.",
      ctaText: "Start My Valuation",
    },
    {
      number: "03",
      title: "Receive your valuation report",
      description:
        "You get a clear valuation with the reasoning behind it — recent comparable sales, current demand, and what's realistically achievable if you decide to sell or rent.",
      ctaText: "Start My Valuation",
    },
  ];

  // --- WHY GOLDEN KEY DATA (Section 03 of the copy deck) ---
  const whyCards = [
    {
      number: "01",
      title: "Community-level expertise",
      description:
        "Dubai isn't one market, it's dozens. Values in Downtown behave nothing like values in JVC or Dubai Hills. Your valuation comes from an agent who works your community specifically, not a generalist reading a citywide average.",
    },
    {
      number: "02",
      title: "Built on live market activity",
      description:
        "We value your property against what is actually transacting right now — recent sales, current listings, and what buyers are genuinely willing to pay — rather than outdated portal asking prices.",
    },
    {
      number: "03",
      title: "An honest number, not a flattering one",
      description:
        "Overpricing a property is the fastest way to leave it sitting on the market for months. We'll tell you what your property is worth, even when that's not the number you were hoping for. That honesty is what protects your sale.",
    },
    {
      number: "04",
      title: "Every detail counts",
      description:
        "Floor level, view, upgrades, layout, service charges, handover condition. Two identical-looking units in the same tower can differ meaningfully in value, and we account for the difference.",
    },
    {
      number: "05",
      title: "Sell, rent, refinance, or simply know",
      description:
        "A valuation isn't a commitment to list. Many owners come to us purely to understand their position before making a decision. That's a perfectly good reason to ask.",
    },
    {
      number: "06",
      title: "Fully RERA-compliant",
      description:
        "Golden Key is a licensed Dubai brokerage, and every valuation and transaction we handle follows RERA and Dubai Land Department requirements.",
    },
  ];

  // --- FAQS DATA (Section 05 of the copy deck) ---
  const faqs = [
    {
      question: "Is the valuation really free?",
      answer:
        "Yes. There is no fee and no obligation to list your property with us. We provide the valuation because owners who understand their position tend to come back to us when they're ready to act.",
    },
    {
      question: "Why do I need a property valuation?",
      answer:
        "Most owners come to us for one of four reasons: to price a property correctly before selling, to understand borrowing power before approaching a bank, to decide whether now is the right moment to sell or hold, or simply to know where their investment stands. All four are valid.",
    },
    {
      question: "How is my property actually valued?",
      answer:
        "We start with recent comparable transactions in your building or community, then adjust for the factors that make your specific property different — floor, view, layout, upgrades, condition, and service charges. Finally, we weigh current buyer demand, because a property is ultimately worth what a buyer will pay for it today.",
    },
    {
      question: "How long does it take?",
      answer:
        "A specialist will contact you shortly after you submit your details. If a site visit is needed, we'll arrange it at a time that suits you, and your report follows soon after the visit.",
    },
    {
      question: "Do you need to visit my property?",
      answer:
        "Not always. For standard units in buildings we know well, we can often value remotely. For villas, upgraded units, and anything unusual, a short visit gives you a considerably more accurate number.",
    },
    {
      question: "Will I be pressured to sell?",
      answer:
        "No. If you tell us you're only exploring, we'll treat it that way. Our job at this stage is to give you accurate information, not to talk you into a decision.",
    },
    {
      question: "Is this the same as a bank valuation?",
      answer:
        "No. A bank valuation is a formal assessment carried out by a bank-approved valuer for mortgage purposes. Ours is a market valuation — what your property can realistically achieve with a buyer today. The two often land close together, but they serve different purposes.",
    },
    {
      question: "Which areas do you cover?",
      answer:
        "We cover residential and commercial property across Dubai. If your property falls outside our usual coverage, we'll tell you honestly rather than guess at a number.",
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
              FREE PROPERTY VALUATION
            </p>

            <h1>
              Know exactly what your
              <br />
              property is worth today
            </h1>

            <p>
              Dubai's market moves fast, and last year's price tells you
              very little about this year's value. Golden Key gives you a
              clear, honest valuation built on current market activity and
              real buyer demand in your community — so you can decide your
              next move with confidence.
            </p>

            <a
              href="#valuation-form"
              className="valuation-coral-button"
            >
              Get My Free Valuation
            </a>

            <p className="trust-line dark">
              Free · No obligation · Your details stay private
            </p>
          </div>
        </section>

        {/* HOW IT WORKS (DYNAMIC SLIDER) */}
        <section className="valuation-process section">
          <div className="wrap">
            <h2 className="valuation-serif centered">
              Your valuation in three simple steps
            </h2>

            <p className="section-intro-text centered">
              No lengthy paperwork, no pressure to sell. Just a clear
              answer to a simple question.
            </p>

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

        {/* WHY GOLDEN KEY */}
        <section className="valuation-apart">
          <div className="wrap">
            <h2 className="valuation-serif centered">
              Why owners come to Golden Key for a valuation
            </h2>

            <p className="section-intro-text centered">
              An accurate valuation isn't a number pulled from a
              calculator. It's a judgement, and judgement comes from
              people who work these communities every day.
            </p>

            <div className="content-cards-grid">
              {whyCards.map((card) => (
                <div className="content-card" key={card.number}>
                  <span className="circle-mark">{card.number}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="valuation-faq-section section">
          <div className="wrap">
            <h2 className="valuation-serif centered">
              Frequently asked questions
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
        </section>

        {/* FORM CTA */}
        <section className="valuation-final" id="valuation-form">
          <div className="wrap">
            <h2>
              Curious what your
              <br />
              property is worth?
            </h2>

            <p>
              Find out in a couple of minutes. No cost, no obligation,
              and no pressure to sell.
            </p>

            <form
              className="valuation-final-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  "Thank you — your request has been received. A Golden Key specialist will contact you shortly to arrange your valuation."
                );
              }}
            >
              <div className="valuation-form-row">
                <input required placeholder="Full name" />
                <input required type="email" placeholder="Email address" />
              </div>

              <div className="valuation-form-row">
                <input required placeholder="Mobile number (+971)" />

                <select required defaultValue="">
                  <option value="" disabled>
                    Property type
                  </option>
                  <option>Apartment</option>
                  <option>Villa</option>
                  <option>Townhouse</option>
                  <option>Penthouse</option>
                  <option>Plot</option>
                  <option>Commercial</option>
                </select>
              </div>

              <div className="valuation-form-row">
                <input required placeholder="Community or building" />

                <select required defaultValue="">
                  <option value="" disabled>
                    Bedrooms
                  </option>
                  <option>Studio</option>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5+</option>
                </select>
              </div>

              <div className="valuation-form-row">
                <input placeholder="Approximate size (sq ft)" />

                <select required defaultValue="">
                  <option value="" disabled>
                    Are you looking to...
                  </option>
                  <option>Sell</option>
                  <option>Rent out</option>
                  <option>Refinance</option>
                  <option>Just curious about value</option>
                </select>
              </div>

              <textarea
                rows="3"
                placeholder="Anything we should know?"
              />

              <button type="submit" className="valuation-coral-button">
                Request My Free Valuation
              </button>

              <p className="form-consent-note">
                By submitting this form you agree to be contacted by
                Golden Key Real Estate regarding your valuation. We
                never share your details with third parties.
              </p>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function ServiceDetail({ eyebrow, title, description, image, sections = [] }) {
  return (
    <>
      <Header />

      <main className="service-detail-page">

        <section className="services-hero">
          <div
            className="services-hero-bg"
            style={image ? { backgroundImage: `url(${image})` } : undefined}
          />
          <div className="services-hero-overlay" />

          <div className="wrap services-hero-content">
            {eyebrow && <p className="pm-gold-label">{eyebrow.toUpperCase()}</p>}
            <h1>{title}</h1>
            {description && <p>{description}</p>}

            <a href="#contact" className="pm-gold-button">
              Talk to Our Team
            </a>
          </div>
        </section>

        {sections.map((section, index) => (
          <section className="section pm-alternating" key={section.title || index}>
            <div className="wrap">
              <div
                className={
                  index % 2 === 1
                    ? "pm-alternate-row reverse reveal"
                    : "pm-alternate-row reveal"
                }
              >
                <div>
                  {section.eyebrow && (
                    <p className="pm-gold-label">{section.eyebrow}</p>
                  )}

                  <h2 className="pm-serif">{section.title}</h2>

                  <p>{section.text}</p>
                </div>

                {section.image && (
                  <div className="pm-real-image pm-image-reveal">
                    <img src={section.image} alt={section.title} />
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}

        <section className="pm-final-cta" id="contact">
          <div className="wrap">
            <p className="pm-gold-label">{eyebrow ? eyebrow.toUpperCase() : "GET IN TOUCH"}</p>
            <h2>Ready to talk it through?</h2>
            <p>Tell us what you're looking for and our team will help you find the right next step.</p>
            <a href="/enquire" className="pm-gold-button">
              Talk to Our Team
            </a>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

function VibrantHolidayHomes() {
  const whatWeHandle = [
    {
      title: "Listing creation and photography",
      text: "Professional imagery and written listings built to convert browsers into bookings, not just to describe the property.",
    },
    {
      title: "Multi-platform distribution",
      text: "Your property listed and synchronised across the major short-stay booking platforms, on one shared calendar, so double bookings can't happen.",
    },
    {
      title: "Dynamic pricing",
      text: "Rates adjusted for season, weekday and weekend demand, city events, and what comparable properties nearby are achieving — rather than one flat nightly figure all year.",
    },
    {
      title: "Guest communication",
      text: "Enquiries, questions, and problems answered promptly, including outside office hours. Slow replies lose bookings.",
    },
    {
      title: "Guest screening",
      text: "Sensible vetting before a booking is confirmed, so the wrong guest doesn't become your problem.",
    },
    {
      title: "Check-in and check-out",
      text: "Arrivals and departures handled by our team, at the hours guests actually travel.",
    },
    {
      title: "Professional cleaning and hotel-standard linen",
      text: "A full turnover clean between every single stay, with fresh linen and towels each time.",
    },
    {
      title: "Restocking and consumables",
      text: "Toiletries, kitchen basics, and welcome essentials kept topped up so nothing runs out mid-stay.",
    },
    {
      title: "Maintenance and routine inspections",
      text: "The property checked regularly and issues fixed before a guest has to report them.",
    },
    {
      title: "DTCM permits and compliance",
      text: "Holiday home licensing, registration, and tourism dirham obligations handled as part of the service.",
    },
    {
      title: "Owner reporting",
      text: "A clear picture of your bookings, occupancy, and earnings, without you having to ask for it.",
    },
  ];

  const whyCards = [
    {
      number: "01",
      title: "Reviews are the entire business",
      description:
        "In short-term rental, your rating decides your visibility, and your visibility decides your rate. Cleaning standards, response times, and the state of the property on arrival all exist to protect that rating. Everything else follows from it.",
    },
    {
      number: "02",
      title: "Priced for the calendar, not for the year",
      description:
        "Dubai demand shifts sharply between peak season, summer, and major city events. Rates that move with it perform considerably better than a fixed nightly price that ignores all three.",
    },
    {
      number: "03",
      title: "It's still your home",
      description:
        "Block out any dates you want, for yourself, family, or friends. That flexibility is usually the whole reason owners choose short-term over an annual lease, and we build the calendar around it.",
    },
    {
      number: "04",
      title: "Compliant from day one",
      description:
        "Short-term letting in Dubai is regulated. Permits, registration, and tourism fees are handled properly, so your income isn't put at risk by a paperwork gap.",
    },
    {
      number: "05",
      title: "Set up right before the first guest",
      description:
        "Furnishing, styling, amenities, and the small details guests actually mention in reviews. We'll tell you honestly what your property needs before it goes live, and what isn't worth spending on.",
    },
    {
      number: "06",
      title: "A deliberately focused portfolio",
      description:
        "Vibrant is a new company and we're taking on properties selectively rather than filling a portfolio as fast as possible. Your property is looked after by a team that knows it individually.",
    },
  ];

  const faqs = [
    {
      question: "What's the difference between a holiday home and a short-term rental?",
      answer:
        "Nothing — they're the same thing. \"Holiday home\" is the term used in Dubai's licensing framework, and \"short-term rental\" is how most owners describe it. Both mean letting your property by the night or week rather than on an annual lease.",
    },
    {
      question: "Who is Vibrant Vacation Homes Rental?",
      answer:
        "Vibrant is the holiday homes company within the Golden Key group — same ownership and same standards as Golden Key Real Estate, set up as its own company because short-term rental is a genuinely different operation to long-term leasing.",
    },
    {
      question: "Can I still use my own property?",
      answer:
        "Yes. Block out any dates you like for yourself, family, or friends. It stays your home, and we plan the calendar around the dates you want.",
    },
    {
      question: "Will I earn more than on a long-term lease?",
      answer:
        "Over a strong year, a well-located and well-presented property usually does. But short-term income is variable, running costs are higher, and results depend heavily on location and presentation. We'll give you a realistic view for your specific property rather than a best-case number.",
    },
    {
      question: "Do you handle the DTCM holiday home permit?",
      answer:
        "Yes. Licensing, registration, and tourism dirham obligations are handled by us as part of the service.",
    },
    {
      question: "Does my property need to be furnished?",
      answer:
        "Yes, fully — furniture, appliances, kitchenware, linen, and the amenities guests expect. If yours isn't there yet, we'll tell you what's genuinely needed and what isn't worth the spend.",
    },
    {
      question: "Who pays for cleaning, linen, and consumables?",
      answer:
        "These are running costs of a holiday home and sit with the owner, as utilities and service charges do. We set them out clearly in your proposal so there are no surprises.",
    },
    {
      question: "What if a guest damages something?",
      answer:
        "Bookings are covered by the deposit and protection schemes the platforms provide, and we inspect between stays so damage is identified immediately rather than weeks later. We handle the claim and the repair.",
    },
    {
      question: "What if I live outside the UAE?",
      answer:
        "Many of our owners do. Everything — setup, licensing, guest arrivals, cleaning, maintenance — runs without you being in the country.",
    },
    {
      question: "Can I switch to a long-term lease later?",
      answer:
        "Yes. Circumstances and market conditions change. Golden Key Real Estate handles long-term management within the same group, so moving between the two is straightforward.",
    },
    {
      question: "My property is currently listed and self-managed. Can you take over?",
      answer:
        "Yes. We can take over an existing listing without losing your reviews or disrupting confirmed bookings.",
    },
    {
      question: "How do your fees work?",
      answer:
        "Fees are a percentage of booking revenue and depend on the property and the level of service. They're set out in writing in your proposal, with no charges introduced later.",
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
            <p className="pm-eyebrow">PART OF THE GOLDEN KEY GROUP</p>

            <h1>
              Your Dubai property,
              <br />
              hosted properly
            </h1>

            <p>
              Vibrant Vacation Homes Rental manages holiday homes and
              short-term rentals across Dubai — listings, pricing,
              guests, cleaning, and licensing. You keep the keys and
              the flexibility. We handle everything else.
            </p>

            <div className="pm-hero-actions">
              <a href="#vibrant-contact" className="pm-gold-button">
                Get My Free Assessment
              </a>

              <a href="/enquire" className="pm-outline-button">
                Talk to Our Team
              </a>
            </div>

            <p className="trust-line">
              Fully managed · DTCM compliant · Use your property whenever you like
            </p>
          </div>
        </section>

        {/* POSITIONING */}
        <section className="section">
          <div className="wrap" style={{ maxWidth: 760, textAlign: "center" }}>
            <h2 className="pm-serif">
              Short-term letting is a hospitality business, not a lease
            </h2>

            <p className="section-intro-text centered">
              An annual tenancy is signed once and reviewed once a year. A
              holiday home turns over constantly — new guests, new
              expectations, new reviews, every week. Listings need
              adjusting. Rates need moving with the season. Messages need
              answering at ten at night, because the guest deciding
              between your property and another one won't wait until
              morning.
            </p>

            <p className="section-intro-text centered">
              That's why Vibrant exists as its own company within the
              Golden Key group. Short-term rental deserves a team that
              does nothing else.
            </p>
          </div>
        </section>

        {/* WHAT WE HANDLE */}
        <section className="section" style={{ background: "#f3f1ec" }}>
          <div className="wrap">
            <p className="pm-gold-label centered">WHAT WE HANDLE</p>

            <h2 className="pm-serif centered">
              Everything a guest sees, and everything they don't
            </h2>

            <p className="section-intro-text centered">
              Your property runs as a fully managed holiday home. Here's
              what that covers.
            </p>

            <div className="content-checklist">
              {whatWeHandle.map((item) => (
                <div className="content-checklist-item" key={item.title}>
                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY OWNERS CHOOSE VIBRANT */}
        <section className="section">
          <div className="wrap">
            <p className="pm-gold-label centered">WHY OWNERS HAND US THE KEYS</p>

            <h2 className="pm-serif centered">
              Why owners choose Vibrant
            </h2>

            <div className="content-cards-grid">
              {whyCards.map((card) => (
                <div className="content-card" key={card.number}>
                  <span className="circle-mark">{card.number}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* IS YOUR PROPERTY SUITABLE */}
        <section className="section" style={{ background: "#f3f1ec" }}>
          <div className="wrap">
            <p className="pm-gold-label centered">IS YOUR PROPERTY SUITABLE?</p>

            <h2 className="pm-serif centered">
              Is your property right for holiday homes?
            </h2>

            <p className="section-intro-text centered">
              Not every property performs well on short stays, and we'd
              rather tell you that at the start than after you've
              furnished it.
            </p>

            <div className="content-suitability-grid">
              <div>
                <h3 className="pm-serif" style={{ fontSize: 20 }}>
                  Strong candidates
                </h3>
                <ul>
                  <li>Well located for tourism, leisure, or business travel</li>
                  <li>Furnished, or you're prepared to furnish it properly</li>
                  <li>Studios, one-bedrooms and two-bedrooms in buildings with good facilities</li>
                  <li>A pool, gym, or beach access in the building</li>
                  <li>Properties you'd like to use yourself part of the year</li>
                  <li>Units currently sitting empty between long-term tenants</li>
                </ul>
              </div>

              <div>
                <h3 className="pm-serif" style={{ fontSize: 20 }}>
                  Usually better on a long-term lease
                </h3>
                <ul>
                  <li>Locations with little visitor demand</li>
                  <li>Buildings where short-term letting isn't permitted</li>
                  <li>Properties needing significant work before they'd photograph or review well</li>
                  <li>Owners who want completely fixed, predictable monthly income</li>
                </ul>
              </div>
            </div>

            <p className="section-intro-text centered" style={{ marginTop: 34 }}>
              Not sure where your property falls? Send us the details and
              we'll give you a straight answer — including when the
              honest answer is that a long-term lease suits it better.
              Our sister company, Golden Key Real Estate, handles that
              side.
            </p>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <a href="#vibrant-contact" className="pm-gold-button">
                Check My Property
              </a>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section pm-testimonials">
          <div className="wrap">
            <p className="pm-gold-label centered">HOW IT WORKS</p>

            <h2 className="pm-serif centered">
              From enquiry to first guest
            </h2>

            <div className="pm-testimonial-grid">
              <article className="pm-testimonial">
                <strong>Step 01 — Property assessment</strong>
                <p>
                  Tell us about your property. We look at the location,
                  the unit, its condition and furnishing, and what
                  comparable holiday homes nearby are achieving.
                </p>
              </article>

              <article className="pm-testimonial">
                <strong>Step 02 — Your proposal</strong>
                <p>
                  We come back with a realistic view of what your
                  property can do on short stays, what it needs before
                  going live, and a clear breakdown of our fees. No
                  obligation to proceed.
                </p>
              </article>

              <article className="pm-testimonial">
                <strong>Step 03 — Setup and licensing</strong>
                <p>
                  Furnishing guidance, styling, photography, listing
                  creation, and the DTCM holiday home permit — all
                  handled by us.
                </p>
              </article>

              <article className="pm-testimonial">
                <strong>Step 04 — Live and hosted</strong>
                <p>
                  Your property goes live across the booking platforms.
                  From there we run it day to day, and you receive
                  regular updates on bookings and earnings.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ENQUIRY FORM */}
        <section className="pm-final-cta" id="vibrant-contact">
          <div className="wrap">
            <p className="pm-gold-label">TELL US ABOUT YOUR PROPERTY</p>

            <h2>
              Let your property earn
              <br />
              while you get your time back
            </h2>

            <p>
              Tell us about your property and we'll give you an honest
              assessment — including whether short-term is the right
              route for it at all. No cost, no obligation.
            </p>

            <form
              className="valuation-final-form"
              style={{ textAlign: "left", maxWidth: 560, margin: "30px auto 0" }}
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  "Thank you — we've received your details. A member of the Vibrant team will be in touch shortly with an assessment of your property."
                );
              }}
            >
              <div className="valuation-form-row">
                <input required placeholder="Full name" />
                <input required type="email" placeholder="Email address" />
              </div>

              <div className="valuation-form-row">
                <input required placeholder="Mobile number (+971)" />

                <select required defaultValue="">
                  <option value="" disabled>
                    Property type
                  </option>
                  <option>Apartment</option>
                  <option>Villa</option>
                  <option>Townhouse</option>
                  <option>Penthouse</option>
                </select>
              </div>

              <div className="valuation-form-row">
                <input required placeholder="Community or building" />

                <select required defaultValue="">
                  <option value="" disabled>
                    Bedrooms
                  </option>
                  <option>Studio</option>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4+</option>
                </select>
              </div>

              <div className="valuation-form-row">
                <select required defaultValue="">
                  <option value="" disabled>
                    Furnishing status
                  </option>
                  <option>Fully furnished</option>
                  <option>Partly furnished</option>
                  <option>Unfurnished</option>
                </select>

                <select required defaultValue="">
                  <option value="" disabled>
                    Current status
                  </option>
                  <option>Vacant</option>
                  <option>Tenanted</option>
                  <option>Handover soon</option>
                  <option>Already listed short-term</option>
                </select>
              </div>

              <select defaultValue="">
                <option value="" disabled>
                  Will you use the property yourself?
                </option>
                <option>Yes, occasionally</option>
                <option>Yes, regularly</option>
                <option>No</option>
              </select>

              <textarea rows="4" placeholder="Anything we should know?" />

              <button type="submit" className="pm-gold-button">
                Send My Details
              </button>

              <p className="form-consent-note">
                By submitting this form you agree to be contacted by
                Vibrant Vacation Homes Rental regarding your property.
                We never share your details with third parties.
              </p>
            </form>
          </div>
        </section>

        {/* FAQ */}
        <section className="section pm-dashboard-section">
          <div className="wrap">
            <p className="pm-gold-label centered">FREQUENTLY ASKED QUESTIONS</p>

            <h2 className="pm-serif centered">
              Your questions, answered
            </h2>

            <div
              className="valuation-faq"
              style={{ maxWidth: 820, margin: "30px auto 0" }}
            >
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
        </section>

      </main>

      <Footer />
    </>
  );
}

function MortgageServices() {
  const serviceCards = [
    {
      title: "First-time buyers",
      text: "If this is your first purchase in the UAE, the paperwork alone can be daunting — pre-approval, valuation, the difference between what you are offered and what you can actually afford. We will walk you through the sequence and make sure nothing surprises you halfway through.",
    },
    {
      title: "Overseas and non-resident buyers",
      text: "Buying from outside the UAE is entirely possible, but the requirements, deposit expectations, and documentation differ from those for residents. We will set out what applies to you before you make an offer, not after.",
    },
    {
      title: "Refinancing an existing mortgage",
      text: "If you took your mortgage out some time ago, your current rate may no longer be competitive. Refinancing can reduce your monthly payment or shorten your term. We will help you work out whether the saving justifies the switching costs.",
    },
    {
      title: "Equity release",
      text: "If your property has risen in value, you may be able to release some of that equity for a renovation, another investment, or another purpose. We will explain what is realistically available and what it costs.",
    },
  ];

  const whyCards = [
    {
      number: "01",
      title: "We tell you your budget before you fall in love with a property",
      description:
        "The worst sequence in property buying is finding the right home and then discovering what you can borrow. Sorting the financing first means everything you view is actually within reach.",
    },
    {
      number: "02",
      title: "Pre-approval makes you a stronger buyer",
      description:
        "A seller choosing between two offers will take the buyer whose financing is already arranged. Pre-approval is not paperwork for its own sake — it is leverage.",
    },
    {
      number: "03",
      title: "We are not tied to one bank's product",
      description:
        "Our interest is in the purchase completing, not in placing you with a particular lender. That means the recommendation you get is based on your circumstances.",
    },
    {
      number: "04",
      title: "One team from offer to handover",
      description:
        "The property, the negotiation, the paperwork, and the financing all run through the same team. Nothing gets lost between two companies blaming each other for the delay.",
    },
    {
      number: "05",
      title: "Honest about affordability",
      description:
        "If the numbers do not work, we will say so. Talking someone into a mortgage they will struggle with helps nobody, and it is a poor way to build a business meant to last.",
    },
  ];

  const glossary = [
    { term: "Pre-approval", meaning: "A lender's conditional confirmation of how much it will lend you, before you have chosen a property. It makes you a credible buyer and tells you your real budget." },
    { term: "Down payment", meaning: "The portion of the purchase price you pay yourself. The rest is the loan." },
    { term: "Loan-to-value (LTV)", meaning: "The loan as a percentage of the property's value. A larger deposit means a lower LTV, which often means a better rate." },
    { term: "Loan term", meaning: "How long you have to repay. Longer term, smaller monthly payment, more total interest." },
    { term: "Interest rate", meaning: "The cost of borrowing, expressed as a yearly percentage of the outstanding balance." },
    { term: "Fixed period", meaning: "The initial stretch during which your rate cannot change." },
    { term: "EMI / monthly instalment", meaning: "The equal monthly amount you pay, covering both interest and repayment of the loan itself." },
    { term: "Amortisation", meaning: "How the loan reduces over time. Early payments are mostly interest; later ones mostly repay the balance." },
    { term: "Valuation", meaning: "The lender's own assessment of what the property is worth. If it comes in below the agreed price, the loan is based on the lower figure." },
    { term: "Debt burden ratio (DBR)", meaning: "The share of your monthly income that goes to servicing debt. Lenders cap this, which is often what limits how much you can borrow." },
    { term: "Early settlement fee", meaning: "A charge for repaying some or all of the loan ahead of schedule. Worth checking before you sign." },
  ];

  const faqs = [
    { question: "How much can I borrow?", answer: "It depends on your income, your existing commitments, your residency status, and the property itself. Rather than guess from a general rule, send us your details and we will give you a realistic figure for your situation." },
    { question: "How much deposit do I need?", answer: "Minimum deposits differ depending on whether you are a UAE national, a resident, or buying from overseas, and on whether the property is ready or off-plan. Additional properties usually require more than your first. We will confirm exactly what applies to your purchase." },
    { question: "Can I get a mortgage if I do not live in the UAE?", answer: "Yes. Non-residents can obtain financing for Dubai property, though the deposit requirement is typically higher and the documentation more involved. We will tell you what is needed before you make an offer." },
    { question: "Should I get pre-approved before I start viewing?", answer: "Yes, and it is one of the few pieces of advice we would give without qualification. Pre-approval tells you your actual budget and makes your offer considerably stronger when a seller is weighing up competing buyers." },
    { question: "How long does the process take?", answer: "Pre-approval is usually the quick part. The full process — valuation, final offer, and completion — takes longer and depends on the lender, the property, and how promptly documents are provided. We will give you a realistic timeline for your case at the outset." },
    { question: "What is the difference between a fixed and a variable rate?", answer: "A fixed rate stays the same for an agreed initial period, so your payments are predictable. A variable rate moves with the market, so payments can go down as well as up. Which suits you depends on your circumstances and your tolerance for change." },
    { question: "Are Islamic mortgages available?", answer: "Yes. Sharia-compliant home finance is widely available in the UAE, structured so that the bank's return comes from the purchase and lease arrangement rather than from charging interest." },
    { question: "Can I get a mortgage on an off-plan property?", answer: "Financing is available for off-plan purchases, though the terms differ from those for a completed property and deposit requirements are typically higher. Availability also depends on the developer and the project." },
    { question: "Can I pay off my mortgage early?", answer: "Usually yes, but lenders often charge an early settlement fee. It is worth checking the terms before you sign rather than discovering them later." },
    { question: "Can I refinance a mortgage I already have?", answer: "Yes. If your current rate is no longer competitive, refinancing may lower your payment or shorten your term. There are switching costs, so it is worth working out whether the saving justifies them — we can help you do that." },
    { question: "Do you charge for mortgage guidance?", answer: "Talk to us and we will set out clearly what, if anything, is payable and at what stage. There is no charge for an initial conversation about your options." },
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
            <p className="pm-eyebrow">MORTGAGE SERVICES</p>

            <h1>
              The right property is
              <br />
              only half the purchase
            </h1>

            <p>
              Financing derails more Dubai property purchases than the
              properties themselves do. Golden Key guides you through
              the mortgage side — what you can realistically borrow,
              what the process involves, and what it costs — so the
              money side is settled before you make an offer rather
              than after.
            </p>

            <div className="pm-hero-actions">
              <a href="#mortgage-contact" className="pm-gold-button">
                Talk to Us About Financing
              </a>

              <a href="/enquire" className="pm-outline-button">
                Request a Call Back
              </a>
            </div>

            <p className="trust-line">
              Free initial conversation · No obligation · Guidance, not a sales pitch
            </p>
          </div>
        </section>

        {/* OUR MORTGAGE SERVICES */}
        <section className="section">
          <div className="wrap">
            <p className="pm-gold-label centered">OUR MORTGAGE SERVICES</p>

            <h2 className="pm-serif centered">
              Help with the financing, not just the property
            </h2>

            <p className="section-intro-text centered">
              Buying a property and financing it are two separate
              processes, and the second one derails more purchases than
              the first. Golden Key guides you through it and
              introduces you to the right lenders for your situation,
              so the mortgage does not become the reason the deal falls
              apart.
            </p>

            <div className="content-cards-grid">
              {serviceCards.map((card) => (
                <div className="content-card" key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY WORK WITH GOLDEN KEY */}
        <section className="section" style={{ background: "#f3f1ec" }}>
          <div className="wrap">
            <p className="pm-gold-label centered">
              WHY WORK WITH GOLDEN KEY ON FINANCING
            </p>

            <h2 className="pm-serif centered">
              Why buyers bring us into the mortgage conversation
            </h2>

            <div className="content-cards-grid">
              {whyCards.map((card) => (
                <div className="content-card" key={card.number}>
                  <span className="circle-mark">{card.number}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* UNDERSTANDING MORTGAGES */}
        <section className="section">
          <div className="wrap" style={{ maxWidth: 820 }}>
            <p className="pm-gold-label centered">
              UNDERSTANDING MORTGAGES IN THE UAE
            </p>

            <h2 className="pm-serif centered">What is a mortgage?</h2>

            <p className="section-intro-text centered">
              A mortgage is a loan secured against the property you are
              buying. Because the property itself acts as security for
              the lender, mortgage rates are typically lower than those
              on unsecured borrowing such as personal loans. You repay
              the loan in monthly instalments over an agreed term, with
              each payment covering both interest and a portion of the
              amount borrowed.
            </p>

            <h3 className="pm-serif" style={{ marginTop: 34 }}>
              Types of mortgage available
            </h3>

            <p>
              <strong>Fixed-rate —</strong> your rate is locked for an
              agreed initial period. Payments are predictable during
              that time, which makes budgeting straightforward. When
              the fixed period ends, the loan usually moves to a
              variable rate.
            </p>

            <p>
              <strong>Variable-rate —</strong> the rate moves in line
              with the lender's rate or a benchmark. Payments can fall
              as well as rise, which suits buyers comfortable with some
              fluctuation.
            </p>

            <p>
              <strong>Islamic (Sharia-compliant) home finance —</strong>{" "}
              structured to avoid interest, typically through Ijara or
              Murabaha arrangements. The bank's return is built into
              the purchase and lease structure rather than charged as
              interest. Widely available across UAE banks.
            </p>

            <p>
              <strong>Offset —</strong> links your savings to your
              mortgage so the balance you hold reduces the amount
              interest is charged on. Useful if you hold meaningful
              savings you do not want to lock away.
            </p>

            <h3 className="pm-serif" style={{ marginTop: 34 }}>
              What lenders look at
            </h3>

            <p>
              Every bank assesses applications slightly differently,
              but broadly they consider your income and how stable it
              is, your existing debts and commitments, your credit
              history, your age relative to the loan term, whether the
              property is ready or off-plan, and whether it is your
              first purchase in the UAE or an additional one. The
              combination of these determines how much you can borrow
              and on what terms — which is why two people buying the
              same property can be offered very different deals.
            </p>

            <h3 className="pm-serif" style={{ marginTop: 34 }}>
              Costs beyond the monthly payment
            </h3>

            <p>
              The monthly instalment is the number everyone focuses on,
              but it is not the whole cost of buying. Depending on the
              transaction you should also budget for property
              registration and transfer fees, the bank's arrangement
              and valuation fees, agency fees, mortgage registration,
              and property and life insurance where the lender requires
              them. These are generally payable upfront rather than
              added to the loan. We will give you a full breakdown for
              your specific purchase before you commit.
            </p>
          </div>
        </section>

        {/* GLOSSARY */}
        <section className="section" style={{ background: "#f3f1ec" }}>
          <div className="wrap" style={{ maxWidth: 820 }}>
            <p className="pm-gold-label centered">KEY TERMS EXPLAINED</p>

            <h2 className="pm-serif centered">
              Mortgage terms, in plain English
            </h2>

            <div className="content-checklist" style={{ marginTop: 30 }}>
              {glossary.map((item) => (
                <div className="content-checklist-item" key={item.term}>
                  <h4>{item.term}</h4>
                  <p>{item.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ENQUIRY FORM */}
        <section className="pm-final-cta" id="mortgage-contact">
          <div className="wrap">
            <p className="pm-gold-label">TALK TO US ABOUT YOUR MORTGAGE</p>

            <h2>
              Know your budget
              <br />
              before you start looking
            </h2>

            <p>
              A short conversation now saves months later. Tell us
              where you are and we will set out your realistic options.
            </p>

            <form
              className="valuation-final-form"
              style={{ textAlign: "left", maxWidth: 560, margin: "30px auto 0" }}
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  "Thank you — we have received your details. A member of our team will be in touch shortly to talk through your options."
                );
              }}
            >
              <div className="valuation-form-row">
                <input required placeholder="Full name" />
                <input required type="email" placeholder="Email address" />
              </div>

              <div className="valuation-form-row">
                <input required placeholder="Mobile number (+971)" />

                <select required defaultValue="">
                  <option value="" disabled>
                    Are you a...
                  </option>
                  <option>UAE national</option>
                  <option>UAE resident</option>
                  <option>Non-resident buyer</option>
                </select>
              </div>

              <div className="valuation-form-row">
                <select required defaultValue="">
                  <option value="" disabled>
                    What do you need?
                  </option>
                  <option>New mortgage</option>
                  <option>Pre-approval</option>
                  <option>Refinancing</option>
                  <option>Equity release</option>
                  <option>Not sure yet</option>
                </select>

                <select required defaultValue="">
                  <option value="" disabled>
                    Have you found a property?
                  </option>
                  <option>Yes, made an offer</option>
                  <option>Yes, still deciding</option>
                  <option>Still searching</option>
                  <option>Just exploring</option>
                </select>
              </div>

              <div className="valuation-form-row">
                <input placeholder="Approximate property budget" />

                <select defaultValue="">
                  <option value="" disabled>
                    Employment
                  </option>
                  <option>Salaried</option>
                  <option>Self-employed</option>
                  <option>Business owner</option>
                  <option>Other</option>
                </select>
              </div>

              <textarea rows="4" placeholder="Anything we should know?" />

              <button type="submit" className="pm-gold-button">
                Request a Call Back
              </button>

              <p className="form-consent-note">
                By submitting this form you agree to be contacted by
                Golden Key Real Estate regarding your enquiry. We never
                share your details with third parties.
              </p>
            </form>
          </div>
        </section>

        {/* FAQ */}
        <section className="section pm-dashboard-section">
          <div className="wrap">
            <p className="pm-gold-label centered">FREQUENTLY ASKED QUESTIONS</p>

            <h2 className="pm-serif centered">Your questions, answered</h2>

            <div
              className="valuation-faq"
              style={{ maxWidth: 820, margin: "30px auto 0" }}
            >
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
      question: "What documents are usually needed to rent in Dubai?",
      answer:
        "Tenants commonly provide a passport, residence visa or visa application, and Emirates ID or Emirates ID application. Exact requirements can vary by landlord and property.",
    },
    {
      question: "What is Ejari?",
      answer:
        "Ejari is Dubai's official tenancy contract registration system. It is commonly required for services connected to the home, including DEWA activation. Dubai Land Department currently allows registration through Dubai REST / its online services or authorised Real Estate Services Trustee centres — online registration needs a copy of the Unified Tenancy Contract, while trustee-centre applications require the original contract and the applicant's Emirates ID.",
    },
    {
      question: "Do I need a move-in permit?",
      answer:
        "Many apartment buildings and gated communities require one. The process is usually arranged with the building or community management after the tenancy and Ejari are in place.",
    },
    {
      question: "Who is responsible for maintenance?",
      answer:
        "Responsibility depends on the tenancy contract. Major maintenance is commonly handled by the landlord, while minor maintenance thresholds may be assigned to the tenant. Always confirm the wording before signing.",
    },
    {
      question: "How much is the DEWA security deposit?",
      answer:
        "DEWA currently lists a refundable security deposit of AED 2,000 for an apartment and AED 4,000 for a villa, in addition to applicable activation charges.",
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
                  essential services. DEWA currently lists a
                  refundable security deposit of AED 2,000 for
                  an apartment and AED 4,000 for a villa, in
                  addition to applicable activation charges.
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
                Buying a property in
                <br />
                Dubai should feel
                <br />
                clear, not complicated.
              </h2>

              <p>
                Whether you are looking for your first home, a ready
                property, an off-plan opportunity, or an investment
                with long-term potential, Golden Key Real Estate helps
                you understand the options and connect with properties
                that match your goals.
              </p>

              <p>
                Our consultants can help you compare locations,
                developers, payment plans, expected costs, mortgage
                options and the key steps involved in completing a
                purchase in Dubai.
              </p>

              <p className="buyer-highlight">
                Start with the right property strategy: tell us what
                you need, compare suitable options, review price and
                payment plan, then move forward with guidance.
              </p>

            </article>

            <aside className="buyer-form-card">

              <p className="buyer-form-label">
                GET IN TOUCH
              </p>

              <h3>
                Need help buying in Dubai?
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
                  placeholder="Full name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email address"
                />

                <input
                  required
                  placeholder="Phone number (+971)"
                />

                <select defaultValue="">
                  <option value="" disabled>
                    Buyer type
                  </option>
                  <option>End user</option>
                  <option>Investor</option>
                </select>

                <select defaultValue="">
                  <option value="" disabled>
                    Property preference
                  </option>
                  <option>Ready</option>
                  <option>Off-plan</option>
                  <option>Not sure</option>
                </select>

                <input placeholder="Budget range" />

                <input placeholder="Preferred area (e.g. Dubai South, Arjan, JVC)" />

                <select defaultValue="">
                  <option value="" disabled>
                    Bedrooms
                  </option>
                  <option>Studio</option>
                  <option>1BR</option>
                  <option>2BR</option>
                  <option>3BR+</option>
                </select>

                <textarea
                  rows="4"
                  placeholder="Anything else about your preferred location, payment plan, handover timeline or investment goal"
                />

                <button
                  type="submit"
                  className="buyer-coral-button"
                >
                  Submit Your Requirement
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
                A straightforward way to prepare, position
                and sell your property.
              </p>

              <h2 className="seller-serif">
                Selling your property in
                Dubai should be clear,
                strategic and well
                managed.
              </h2>

              <p>
                Whether you own an apartment, villa, townhouse or
                investment property, Golden Key Real Estate helps you
                understand the market, position your property correctly
                and connect with serious buyers.
              </p>

              <p>
                Our consultants can support you with market pricing,
                property presentation, marketing, buyer enquiries,
                viewings, negotiations and the key steps involved in
                completing a property sale in Dubai.
              </p>

              <p className="seller-highlight">
                A smarter way to sell: share your property details,
                review market positioning, market to serious buyers,
                then negotiate and complete the sale.
              </p>

            </article>

            <aside className="seller-form-card">

              <p className="seller-form-label">
                GET IN TOUCH
              </p>

              <h3>
                Thinking of selling
                your property?
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
                  placeholder="Full name"
                />

                <input
                  required
                  type="email"
                  placeholder="Email address"
                />

                <input
                  required
                  placeholder="Phone number (+971)"
                />

                <select defaultValue="">
                  <option value="" disabled>
                    Property type
                  </option>
                  <option>Apartment</option>
                  <option>Villa</option>
                  <option>Townhouse</option>
                </select>

                <input required placeholder="Community / area (e.g. Arjan, JVC, Dubai South)" />

                <input placeholder="Building / project" />

                <select defaultValue="">
                  <option value="" disabled>
                    Bedrooms
                  </option>
                  <option>Studio</option>
                  <option>1BR</option>
                  <option>2BR</option>
                  <option>3BR+</option>
                </select>

                <input placeholder="Expected selling price" />

                <textarea
                  rows="4"
                  placeholder="Is the property vacant or tenanted, furnished or unfurnished, its condition, availability for viewings, or anything else"
                />

                <button
                  type="submit"
                  className="seller-coral-button"
                >
                  Request a Seller Consultation
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

if (path === "/services/mortgage-services") {
  return <MortgageServices />;
}

if (path === "/services/holiday-home-services") {
  return <VibrantHolidayHomes />;
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

  if (path.startsWith("/insights/")) {
    const slug = path.split("/insights/")[1];
    return <InsightArticleDetail slug={slug} />;
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
      kicker="Golden Key"
      text="This page is ready for the client's final content."
    />
  );
}
export default App;