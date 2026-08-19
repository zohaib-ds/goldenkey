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

function normalizeProperty(property) {
  const images = normalizeImages(property);

  const listingType = String(
    property?.listingType || ""
  ).toUpperCase();

  const purpose =
    listingType === "RENT"
      ? "rent"
      : listingType === "NEW"
      ? "new"
      : "buy";

  return {
    id: String(
      property?.propertyId ??
      property?.id ??
      ""
    ),

    externalId:
      property?.propertyId ??
      property?.id ??
      "",

    reference: String(
      property?.propertyId ??
      property?.reference ??
      ""
    ),

    title:
      property?.title ||
      property?.name ||
      "Property",

    location:
      property?.community ||
      property?.region ||
      property?.location ||
      "",

    city:
      property?.cityName ||
      property?.city ||
      "",

    price: Number(
      property?.price || 0
    ),

    purpose,

    propertyType:
      Array.isArray(property?.propertyType)
        ? property.propertyType[0]
        : property?.propertyType ||
          "Apartment",

    bedrooms:
      property?.bedRooms ??
      property?.bedrooms ??
      "",

    bathrooms:
      property?.bathrooms ??
      "",

    area:
      property?.size ??
      property?.area ??
      "",

    description:
      property?.description ||
      "",

    status:
      String(
        property?.status || "ACTIVE"
      ).toUpperCase() === "ACTIVE"
        ? "published"
        : "draft",

    agent:
      property?.agent ||
      property?.agentInfo ||
      null,

    developer:
      property?.developer ||
      null,

    features:
      property?.amenities ||
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
      "",

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

    const requestedPurpose =
      String(
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
        Number(req.query?.size || 20),
        1
      ),
      500
    );

    const requestBody = {
      bedRoomNum: [],
      cityIds: [],
      regionIds: [],
      communityIds: [],
      developerIds: [],
      agentIds: [],

      completionStatusList: [],

      dateStart: "",
      dateEnd: "",

      name: "",

      page,
      size,

      propertyType: [],

      startPrice: 0,
      endPrice: 0,

      ssize: 0,
      esize: 0,

      listingType,

      sort: "ID",
      sortType: "DESC",
    };

    const response = await fetch(
      "https://dataapi.pixxicrm.ae/pixxiapi/v1/properties",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
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
          statusCode:
            data?.statusCode ||
            response.status,
          message:
            data?.message ||
            "Pixxi request failed",
          pixxi: data,
        });
    }

    /*
      Pixxi current API response uses:
      data.list
      totalListings
      etc.
    */

    const rawProperties =
      Array.isArray(data?.data?.list)
        ? data.data.list
        : Array.isArray(data?.list)
        ? data.list
        : [];

    const properties =
      rawProperties.map(
        normalizeProperty
      );

    return res.status(200).json({
      success: true,

      statusCode:
        data?.statusCode ||
        response.status,

      message:
        data?.message || "success",

      purpose:
        requestedPurpose,

      listingType,

      page,

      size,

      totalListings:
        data?.totalListings ??
        data?.data?.totalSize ??
        properties.length,

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