function toAbsoluteUrl(path) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Pixxi returns relative paths like "/profile/upload/2024/01/30/xxx.jpg"
  return `https://pixxicrm.ae/api${path}`;
}

function parsePaymentPlan(raw) {
  if (!raw) return null;

  // paymentPlan comes back as a JSON *string*, not an object
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);

      return {
        firstInstallment: parsed.one ?? null,
        underConstruction: parsed.two ?? null,
        onHandover: parsed.three ?? null,
        postHandover: parsed.four ?? null,
        raw: parsed,
      };
    } catch {
      return null;
    }
  }

  // already an object (defensive, in case Pixxi changes this)
  if (typeof raw === "object") {
    return {
      firstInstallment: raw.one ?? null,
      underConstruction: raw.two ?? null,
      onHandover: raw.three ?? null,
      postHandover: raw.four ?? null,
      raw,
    };
  }

  return null;
}

function normalizeProjectDetail(raw) {
  const listingType = String(raw?.propertyType || "").toUpperCase();

  // Pixxi nests type-specific data under one of these three, using the
  // exact key names below (note: NOT newParam/sellParam/rentParam)
  const newParam = raw?.newParameter || null;
  const sellParam = raw?.sellParameter || null;
  const rentParam = raw?.rentParameter || null;

  const typeParam = newParam || sellParam || rentParam || {};

  const photos = Array.isArray(raw?.photos)
    ? raw.photos.map(toAbsoluteUrl).filter(Boolean)
    : [];

  // Floor plans only exist for NEW listings, nested inside newParameter.
  // Field name unconfirmed beyond this doc version — verify with ?debug=1
  const floorPlanRaw = Array.isArray(newParam?.floorPlan)
    ? newParam.floorPlan
    : [];

  const floorPlans = floorPlanRaw.map((plan) => ({
    id: plan?.id || "",
    name: plan?.name || plan?.title || "",
    title: plan?.title || plan?.name || "",
    price: plan?.price || "",
    area: plan?.area || "",
    images: Array.isArray(plan?.imgUrl)
      ? plan.imgUrl.map(toAbsoluteUrl).filter(Boolean)
      : [],
  }));

  // Brochure field name unconfirmed — check ?debug=1 raw output and
  // adjust this line if the real key differs
  const brochureCandidates =
    newParam?.developerBrochures ||
    raw?.developerBrochures ||
    raw?.brochures ||
    [];

  const brochures = Array.isArray(brochureCandidates)
    ? brochureCandidates.map(toAbsoluteUrl).filter(Boolean)
    : [];

  return {
    id: String(raw?.propertyId ?? raw?.id ?? ""),
    internalId: raw?.id ?? "",
    propertyId: raw?.propertyId ?? "",

    title: raw?.name || raw?.title || "Property",

    status: String(raw?.status || "").toUpperCase(),
    listingType,

    price: Number(raw?.price || 0),

    propertyType: Array.isArray(raw?.houseType)
      ? raw.houseType
      : raw?.houseType
      ? [raw.houseType]
      : [],

    description: raw?.description || "",

    region: raw?.regionName || raw?.region || "",
    city: raw?.cityName || raw?.city || "",
    community: raw?.communityName || raw?.community || "",

    developer: raw?.developerName || "",

    size: raw?.size ?? "",
    plotSize: raw?.plotSize ?? "",
    bedrooms: raw?.bedRoomNum ?? "",

    agent: {
      name: raw?.agentName || "",
      phone: raw?.agentPhone || "",
      email: raw?.agentEmail || "",
      avatar: toAbsoluteUrl(raw?.agentAvatar || ""),
    },

    photos,
    image1: photos[0] || "",
    image2: photos[1] || "",
    image3: photos[2] || "",
    image4: photos[3] || "",
    image5: photos[4] || "",

    // Type-specific block, whichever applies
    details: {
      totalFloor: typeParam?.totalFloor ?? "",
      serviceCharge: typeParam?.serviceCharge ?? "",
      parking: typeParam?.parking ?? "",
      bathrooms: typeParam?.bathrooms ?? "",
      occupancy: typeParam?.occupancy ?? "",
      buildYear: typeParam?.buildYear ?? "",
      view360: typeParam?.view360 ?? "",
      videoLink: typeParam?.videoLink ?? "",
    },

    // NEW-project-specific fields
    handoverTime: newParam?.handoverTime || "",
    totalUnits: newParam?.totalUnits ?? "",
    minSize: newParam?.minSize ?? "",
    maxSize: newParam?.maxSize ?? "",
    bedroomMin: newParam?.bedroomMin ?? "",
    bedroomMax: newParam?.bedroomMax ?? "",
    paymentPlan: parsePaymentPlan(newParam?.paymentPlan),
    floorPlans,
    brochures,
    brochureUrl: brochures[0] || "",

    createdBy: raw?.createName || "",
    createTime: raw?.createTime || "",
    updateTime: raw?.updateTime || "",

    raw,
  };
}

export default async function handler(req, res) {
  try {
    const token = process.env.PIXXI_API_TOKEN;

    if (!token) {
      return res.status(500).json({
        success: false,
        error: "PIXXI_API_TOKEN is missing",
      });
    }

    const propertyId = req.query?.id;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: "Project ID is required",
      });
    }

    const response = await fetch(
      `https://dataapi.pixxicrm.ae/pixxiapi/v1/${encodeURIComponent(propertyId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-PIXXI-TOKEN": token,
        },
      }
    );

    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    // Hit /api/pixxi/project?id=XXX&debug=1 to see the exact raw Pixxi
    // payload — use this to confirm/fix the brochure & floorPlan field
    // names before trusting the normalized output below.
    if (req.query?.debug === "1") {
      return res.status(response.status).json({
        success: response.ok,
        pixxi: data,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.message || "Could not load project",
        pixxi: data,
      });
    }

    const rawProject = data?.data || data?.property || data;

    const project = normalizeProjectDetail(rawProject);

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Pixxi project error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}