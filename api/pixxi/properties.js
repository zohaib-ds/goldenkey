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

function normalizeImages(property) {
  const rawImages =
    property?.photos ||
    property?.images ||
    property?.media ||
    property?.propertyImages ||
    [];

  if (!Array.isArray(rawImages)) {
    return [];
  }

  return rawImages
    .map((item) => {
      if (typeof item === "string") {
        return item.startsWith("http")
          ? item
          : `https://dataapi.pixxicrm.ae${item}`;
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

function normalizeProperty(property) {
  const images = normalizeImages(property);

  const listingType = String(
    pick(property, [
      "listingType",
      "propertyType",
    ])
  ).toUpperCase();

  const purpose =
    listingType === "RENT"
      ? "rent"
      : listingType === "SELL"
      ? "buy"
      : listingType === "NEW"
      ? "new"
      : "buy";

  const propertyType =
    property?.houseType?.[0] ||
    property?.propertyType ||
    "Apartment";

  return {
    id: String(
      pick(property, [
        "propertyId",
        "id",
      ])
    ),

    externalId: pick(property, [
      "propertyId",
      "id",
    ]),

    reference: pick(property, [
      "propertyId",
      "referenceNumber",
      "reference",
    ]),

    title: pick(property, [
      "title",
      "name",
    ]),

    location: pick(property, [
      "communityName",
      "regionName",
      "region",
      "community",
      "location",
      "address",
    ]),

    city: pick(property, [
      "cityName",
      "city",
      "emirate",
    ]),

    price: Number(
      pick(
        property,
        ["price"],
        0
      )
    ),

    purpose,

    propertyType,

    bedrooms: pick(property, [
      "bedRoomNum",
      "bedrooms",
      "bedroom",
      "beds",
    ]),

    bathrooms: pick(property, [
      "bathrooms",
      "bathroom",
      "baths",
      "sellParameter.bathrooms",
    ]),

    area: pick(property, [
      "size",
      "area",
      "builtUpArea",
      "propertySize",
    ]),

    description: pick(property, [
      "description",
      "remarks",
    ]),

    status:
      String(
        property?.status || "ACTIVE"
      ).toUpperCase() === "ACTIVE"
        ? "published"
        : "draft",

    agent:
      property?.agent || {
        name: property?.agentName || "",
        phone: property?.agentPhone || "",
        email: property?.agentEmail || "",
        avatar: property?.agentAvatar || "",
      },

    developer: {
      id: property?.developerId || null,
      name:
        property?.developerName ||
        property?.developer ||
        "",
    },

    features:
      property?.amenities ||
      property?.sellParameter?.amenities ||
      property?.features ||
      [],

    images,

    image1: images[0] || "",
    image2: images[1] || "",
    image3: images[2] || "",
    image4: images[3] || "",
    image5: images[4] || "",

    brochureUrl:
      property?.brochureUrl ||
      property?.brochure ||
      property?.pdfUrl ||
      property?.pdf ||
      "",

    videoLink:
      property?.videoLink || "",

    view360:
      property?.View360 || "",

    raw: property,
  };
}

export default async function handler(req, res) {
  try {
    const token =
      process.env.PIXXI_API_TOKEN;

    if (!token) {
      return res.status(500).json({
        success: false,
        error:
          "PIXXI_API_TOKEN is missing",
      });
    }

    const requestedPurpose = String(
      req.query?.purpose || "buy"
    ).toLowerCase();

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
      Math.max(
        Number(req.query?.size || 10),
        1
      ),
      100
    );

    const companyName =
      "GOLDENKEY REAL ESTATE BUYING & SELLING BROKERAGE L.L.C";

    const endpoint =
      `https://dataapi.pixxicrm.ae/v1/properties/${encodeURIComponent(
        companyName
      )}`;

    const requestBody = {
      bedRoomNum: [],
      cityIds: [],
      communityIds: [],
      completionStatus: "",
      dateEnd: "",
      dateStart: "",
      developerIds: [],
      endPrice: 0,
      esize: 0,
      listingType,
      name: "",
      page,
      propertyType: [],
      regionIds: [],
      size,
      sort: "ID",
      sortType: "DESC",
      startPrice: 0,
      ssize: 0,
      status: "ACTIVE",
    };

    console.log(
      "PIXxi properties request:",
      {
        endpoint,
        listingType,
        page,
        size,
      }
    );

    const response = await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
          "Accept":
            "application/json",
          "X-PIXXI-TOKEN":
            token,
        },

        body:
          JSON.stringify(requestBody),
      }
    );

    const text =
      await response.text();

    let data;

    try {
      data = text
        ? JSON.parse(text)
        : {};
    } catch {
      data = {
        raw: text,
      };
    }

    if (!response.ok) {
      return res
        .status(response.status)
        .json({
          success: false,
          error:
            "Pixxi properties request failed",
          pixxi: data,
        });
    }

    /*
      Pixxi's documented response structure:
      {
        statusCode,
        message,
        data,
        totalListings,
        list,
        sellListings,
        rentListings,
        newProjectListings
      }

      Some accounts/responses may wrap list
      under data.
    */

    const rawProperties =
      Array.isArray(data?.list)
        ? data.list
        : Array.isArray(
            data?.data?.list
          )
        ? data.data.list
        : Array.isArray(
            data?.data
          )
        ? data.data
        : [];

    const properties =
      rawProperties.map(
        normalizeProperty
      );

    return res.status(200).json({
      success:
        String(
          data?.message || ""
        ).toLowerCase() ===
          "success" ||
        data?.statusCode === 200 ||
        response.ok,

      statusCode:
        data?.statusCode ||
        response.status,

      message:
        data?.message || "",

      purpose:
        requestedPurpose,

      listingType,

      page,

      size,

      totalListings:
        data?.totalListings ??
        data?.data?.totalListings ??
        properties.length,

      sellListings:
        data?.sellListings ??
        data?.data?.sellListings ??
        0,

      rentListings:
        data?.rentListings ??
        data?.data?.rentListings ??
        0,

      newProjectListings:
        data?.newProjectListings ??
        data?.data?.newProjectListings ??
        0,

      count:
        properties.length,

      properties,
    });

  } catch (error) {
    console.error(
      "Pixxi properties error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}