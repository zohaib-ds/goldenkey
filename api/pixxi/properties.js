function pick(obj, keys, fallback = "") {
  for (const key of keys) {
    if (
      obj &&
      obj[key] !== undefined &&
      obj[key] !== null &&
      obj[key] !== ""
    ) {
      return obj[key];
    }
  }

  return fallback;
}

function findArray(data) {
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.properties,
    data?.data,
    data?.data?.properties,
    data?.results,
    data?.data?.results,
    data?.items,
    data?.data?.items,
    data?.result,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function normalizeImages(property) {
  const rawImages =
    property?.images ||
    property?.photos ||
    property?.media ||
    property?.propertyImages ||
    [];

  if (Array.isArray(rawImages)) {
    return rawImages
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return (
          item?.url ||
          item?.imageUrl ||
          item?.src ||
          item?.fileUrl ||
          ""
        );
      })
      .filter(Boolean);
  }

  return [];
}

function normalizeProperty(property) {
  const images = normalizeImages(property);

  const purposeRaw = String(
    pick(property, [
      "listingType",
      "purpose",
      "type",
      "listing_type",
    ])
  ).toUpperCase();

  const purpose =
    purposeRaw.includes("RENT")
      ? "rent"
      : purposeRaw.includes("SELL")
      ? "buy"
      : purposeRaw.includes("SALE")
      ? "buy"
      : "buy";

  return {
    id: String(
      pick(property, [
        "id",
        "propertyId",
        "property_id",
        "referenceNumber",
        "reference",
      ])
    ),

    externalId: pick(property, [
      "id",
      "propertyId",
      "property_id",
    ]),

    reference: pick(property, [
      "referenceNumber",
      "reference",
      "propertyReference",
      "property_reference",
    ]),

    title: pick(property, [
      "title",
      "propertyTitle",
      "name",
      "propertyName",
    ]),

    location: pick(property, [
      "location",
      "community",
      "area",
      "address",
      "subCommunity",
    ]),

    city: pick(property, [
      "city",
      "emirate",
    ]),

    price: Number(
      pick(property, [
        "price",
        "salePrice",
        "rentPrice",
        "amount",
      ], 0)
    ),

    purpose,

    propertyType: pick(property, [
      "propertyType",
      "property_type",
      "type",
      "propertyCategory",
    ], "Apartment"),

    bedrooms: pick(property, [
      "bedrooms",
      "bedroom",
      "beds",
    ]),

    bathrooms: pick(property, [
      "bathrooms",
      "bathroom",
      "baths",
    ]),

    area: pick(property, [
      "area",
      "size",
      "builtUpArea",
      "propertySize",
      "sizeSqft",
    ]),

    description: pick(property, [
      "description",
      "propertyDescription",
      "remarks",
    ]),

    status: "published",

    agent: property?.agent || property?.listingAgent || null,

    developer: property?.developer || null,

    features:
      property?.features ||
      property?.amenities ||
      [],

    images,

    image1: images[0] || "",
    image2: images[1] || "",
    image3: images[2] || "",
    image4: images[3] || "",
    image5: images[4] || "",

    brochureUrl: pick(property, [
      "brochureUrl",
      "brochure",
      "brochureURL",
      "pdfUrl",
      "pdf",
    ]),

    raw: property,
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

    const requestedPurpose =
      String(req.query?.purpose || "buy").toLowerCase();

    const listingType =
      requestedPurpose === "rent"
        ? "RENT"
        : requestedPurpose === "new"
        ? "NEW"
        : "SELL";

    const page = Math.max(
      Number(req.query?.page || 1),
      1
    );

    const size = Math.min(
      Math.max(Number(req.query?.size || 50), 1),
      100
    );

    const response = await fetch(
      "https://dataapi.pixxicrm.ae/pixxiapi/v1/properties",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "X-PIXXI-TOKEN": token,
        },

        body: JSON.stringify({
          listingType,
          page,
          size,
        }),
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text,
      };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "Pixxi properties request failed",
        data,
      });
    }

    const rawProperties = findArray(data);

    const properties =
      rawProperties.map(normalizeProperty);

    return res.status(200).json({
      success: true,
      purpose: requestedPurpose,
      listingType,
      page,
      size,
      count: properties.length,
      properties,
    });
  } catch (error) {
    console.error("Pixxi properties error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}