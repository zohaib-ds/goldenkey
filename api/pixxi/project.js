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
      `https://dataapi.pixxicrm.ae/pixxiapi/v1/${encodeURIComponent(
        propertyId
      )}`,
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
      data = {
        raw: text,
      };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error:
          data?.message ||
          "Could not load project",
        pixxi: data,
      });
    }

    const rawProject =
      data?.data || data?.property || data;

    const rawImages =
      rawProject?.photos ||
      rawProject?.images ||
      [];

    const images = Array.isArray(rawImages)
      ? rawImages.map((image) => {
          if (!image) return "";

          if (
            image.startsWith("http://") ||
            image.startsWith("https://")
          ) {
            return image;
          }

          return `https://pixxicrm.ae/api${image}`;
        }).filter(Boolean)
      : [];

    const brochures =
      Array.isArray(
        rawProject?.newParam?.developerBrochures
      )
        ? rawProject.newParam.developerBrochures
            .map((file) => {
              if (!file) return "";

              if (
                file.startsWith("http://") ||
                file.startsWith("https://")
              ) {
                return file;
              }

              return `https://pixxicrm.ae/api${file}`;
            })
            .filter(Boolean)
        : [];

    const project = {
      ...rawProject,

      id:
        rawProject?.propertyId ||
        rawProject?.id ||
        propertyId,

      title:
        rawProject?.title ||
        rawProject?.name ||
        "New Project",

      location:
        rawProject?.community ||
        rawProject?.regionName ||
        rawProject?.region ||
        rawProject?.location ||
        "",

      city:
        rawProject?.cityName ||
        rawProject?.city ||
        "",

      developer:
        rawProject?.developer ||
        rawProject?.developerName ||
        "",

      price:
        rawProject?.price || 0,

      description:
        rawProject?.description || "",

      features:
        rawProject?.amenities ||
        rawProject?.features ||
        [],

      images,

      image1: images[0] || "",
      image2: images[1] || "",
      image3: images[2] || "",
      image4: images[3] || "",
      image5: images[4] || "",

      brochureUrl:
        brochures[0] || "",

      brochures,

      newParam:
        rawProject?.newParam || {},

      agent:
        rawProject?.agent ||
        null,
    };

    return res.status(200).json({
      success: true,
      project,
    });

  } catch (error) {
    console.error(
      "Pixxi project error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}