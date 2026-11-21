"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Need = "furnishings" | "improvement" | "property" | "planning" | "car" | "car-insurance" | "car-rental" | "medical" | "retail" | "school-supplies" | "gift" | "unsupported";
type Journey = "moving" | "refreshing" | "renovating";
type Provider = "IKEA" | "ACE";
type PropertyIntent = "rent" | "buy" | "either";
type VehicleMake = "Any make" | "Toyota" | "Lexus" | "Honda" | "Volvo" | "BYD";
type MedicalCover = "individual" | "family" | "not-sure";
type RetailCategory = "clothing" | "shoes";
type GiftCategory = "all" | "watches" | "fashion" | "home" | "toys" | "electronics" | "unsupported";
type SearchCriteria = {
  journey: Journey;
  emirate: string;
  homeType: string;
  propertyIntent: PropertyIntent;
  bedroomPreference: string;
  selectedNeeds: Need[];
  vehicleMake: VehicleMake;
  vehiclePriceMin?: number | null;
  vehiclePriceMax?: number | null;
  medicalCover: MedicalCover;
  retailCategory: RetailCategory;
  giftCategory?: GiftCategory;
};

type Recommendation = {
  brand: string;
  provider?: Provider;
  label: string;
  title: string;
  description: string;
  reason: string;
  tag: string;
  href?: string;
  cta: string;
  price?: string;
};

type PropertyOffer = {
  brand: string;
  intent: Exclude<PropertyIntent, "either">;
  bedrooms: number[];
  label: string;
  title: string;
  description: string;
  href: string;
  tag: string;
};

const requestSuggestions = ["Rent a car", "Find a home", "Buy a gift"];
const supportedEmirates = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];

const retailBrands: { brand: string; categories: RetailCategory[]; description: string; href: string; tag: string }[] = [
  {
    brand: "Zara",
    categories: ["clothing", "shoes"],
    description: "Explore clothing and footwear on Zara’s UAE store.",
    href: "https://www.zara.com/ae/",
    tag: "UAE online store",
  },
  {
    brand: "Marks & Spencer",
    categories: ["clothing", "shoes"],
    description: "Explore clothing and footwear on Marks & Spencer’s UAE store.",
    href: "https://www.marksandspencer.ae/en-ae/",
    tag: "UAE online store",
  },
  {
    brand: "Ted Baker",
    categories: ["clothing"],
    description: "Explore Ted Baker clothing on its UAE store.",
    href: "https://www.tedbaker.ae/",
    tag: "UAE online store",
  },
];

const giftStores: { brand: string; categories: Exclude<GiftCategory, "all" | "jewelry" | "beauty" | "spa">[]; description: string; href: string }[] = [
  { brand: "Seiko", categories: ["watches"], description: "Explore Seiko watches through Al-Futtaim’s UAE brand page and check current models with the retailer.", href: "https://www.alfuttaim.com/en/our-brands/seiko/" },
  { brand: "Zara", categories: ["fashion"], description: "Browse Zara UAE fashion and accessories; confirm current gift items and availability with the store.", href: "https://www.zara.com/ae/" },
  { brand: "Marks & Spencer", categories: ["fashion"], description: "Browse Marks & Spencer UAE for clothing and accessories that may suit a gift; confirm current products with the store.", href: "https://www.marksandspencer.ae/en-ae/" },
  { brand: "Ted Baker", categories: ["fashion"], description: "Browse Ted Baker UAE fashion and accessories; confirm current gift items and availability with the store.", href: "https://www.tedbaker.ae/" },
  { brand: "IKEA", categories: ["home"], description: "Explore home and lifestyle gifts from IKEA UAE; check current products and stock with the store.", href: "https://www.ikea.com/ae/en/" },
  { brand: "Toys\"R\"Us UAE", categories: ["toys"], description: "Browse Toys\"R\"Us UAE for toys and children’s gifts; confirm current assortment with the store.", href: "https://toysrusmena.com/" },
  { brand: "Panasonic", categories: ["electronics"], description: "Explore Panasonic products through Al-Futtaim’s UAE brand page and confirm current gift options with the retailer.", href: "https://www.alfuttaim.com/en/our-brands/panasonic/" },
];

const journeyLabels: Record<Journey, string> = {
  moving: "Moving into a home",
  refreshing: "Refreshing a room",
  renovating: "Planning an improvement",
};

const propertyOffers: PropertyOffer[] = [
  {
    brand: "Al Badia Living",
    intent: "rent",
    bedrooms: [1, 2, 3, 4],
    label: "For rent · Dubai Festival City",
    title: "Al Badia Living",
    description: "One- to four-bedroom apartments. Dubai Festival City currently lists the community as leasing.",
    href: "https://albadialiving.com/?utm_source=dfc_website&utm_medium=live_page&utm_id=block",
    tag: "Leasing listed",
  },
  {
    brand: "Al Badia Residences",
    intent: "rent",
    bedrooms: [1, 2, 3],
    label: "For rent · Dubai Festival City",
    title: "Al Badia Residences",
    description: "Low-rise apartments set among landscaped gardens. The official page lists one- to three-bedroom homes for rent.",
    href: "https://www.dubaifestivalcity.com/live/rent-a-property/al-badia-residences/",
    tag: "Rental property",
  },
  {
    brand: "Marsa Plaza",
    intent: "buy",
    bedrooms: [1, 2, 3, 4],
    label: "For sale · Dubai Festival City",
    title: "Marsa Plaza",
    description: "Creek-side one- to three-bedroom apartments and three- to four-bedroom duplexes. Confirm current sales availability with the property team.",
    href: "https://www.dubaifestivalcity.com/live/buy-a-property/marsa-plaza/",
    tag: "For sale",
  },
  {
    brand: "Al Badia Hillside",
    intent: "buy",
    bedrooms: [1, 3],
    label: "For sale · Dubai Festival City",
    title: "Al Badia Hillside",
    description: "A residential community with published one-bedroom-plus-study and three-bedroom floor plans. Confirm current availability with the property team.",
    href: "https://www.dubaifestivalcity.com/live/al-badia-hillside/",
    tag: "For sale",
  },
];

const vehicleMakes: Exclude<VehicleMake, "Any make">[] = ["Toyota", "Lexus", "Honda", "Volvo", "BYD"];

function resolveRequestNeed(
  normalized: string,
  context: { hasSchoolSupplies: boolean; hasGift: boolean; hasCarRental: boolean; hasCarInsurance: boolean; hasMedical: boolean; hasProperty: boolean; hasCar: boolean },
): Need {
  const routes: { need: Need; matches: boolean }[] = [
    { need: "school-supplies", matches: context.hasSchoolSupplies },
    { need: "car-rental", matches: context.hasCarRental },
    { need: "car-insurance", matches: context.hasCarInsurance },
    { need: "car", matches: context.hasCar },
    { need: "medical", matches: context.hasMedical && !context.hasCarInsurance },
    { need: "property", matches: context.hasProperty },
    { need: "gift", matches: context.hasGift },
    { need: "retail", matches: /clothes|clothing|fashion|shoes|footwear|shop/.test(normalized) },
    { need: "furnishings", matches: /furniture|furnish|sofa|\bbed\b|storage|room/.test(normalized) },
    { need: "improvement", matches: /diy|repair|fix|renovat|improv|tool|paint/.test(normalized) },
    { need: "property", matches: /property|home|house|apartment|villa|rent|buy|move into/.test(normalized) },
  ];

  return routes.find((route) => route.matches)?.need ?? "planning";
}

function resolveGiftCategory(normalized: string): GiftCategory {
  if (/jewel|jewelry|jewellery|cosmetic|makeup|beauty|perfume|fragrance|spa|massage|voucher|gift[\s-]*card/.test(normalized)) return "unsupported";
  if (/watch|watches|timepiece|seiko/.test(normalized)) return "watches";
  if (/bag|bags|handbag|accessor|fashion|clothes|clothing|scarf|wallet/.test(normalized)) return "fashion";
  if (/home|house|kitchen|decor|candle|living/.test(normalized)) return "home";
  if (/toy|toys|children|kid|baby|game/.test(normalized)) return "toys";
  if (/electronic|headphone|tablet|phone|camera|speaker|panasonic/.test(normalized)) return "electronics";
  return "all";
}

function isGiftRequest(normalized: string): boolean {
  return /\bgift\b|\bgifts\b|\bpresent\b|\bpresents\b|watch|timepiece|jewel|jewelry|jewellery|cosmetic|makeup|beauty|perfume|fragrance|spa|massage|voucher|gift[\s-]*card|handbag|\bbags?\b|\bwallet\b|accessor|\btoys?\b|headphone/.test(normalized);
}

const toyotaModels: { brand: "Toyota"; name: string; price: number; body: string; href: string }[] = [
  { brand: "Toyota", name: "Yaris", price: 64900, body: "Compact sedan", href: "https://www.toyota.ae/en/new-cars/yaris/" },
  { brand: "Toyota", name: "Corolla", price: 76900, body: "Sedan", href: "https://www.toyota.ae/en/new-cars/corolla/" },
  { brand: "Toyota", name: "Camry", price: 122900, body: "Sedan", href: "https://www.toyota.ae/en/new-cars/camry/" },
  { brand: "Toyota", name: "RAV4", price: 105900, body: "SUV", href: "https://www.toyota.ae/en/new-cars/rav4/" },
  { brand: "Toyota", name: "Land Cruiser Prado", price: 199900, body: "SUV", href: "https://www.toyota.ae/en/new-cars/land-cruiser-prado/" },
];

const carModels: { brand: Exclude<VehicleMake, "Any make">; name: string; body: string; href: string; price?: number }[] = [
  ...toyotaModels,
  ...[
    ["City", "Sedan", "cars/new-city"], ["Civic", "Sedan", "cars/Civic-MMC"], ["Civic Type R", "Performance hatchback", "cars/Civic-TypeR"],
    ["Accord 1.5L", "Sedan", "cars/New-Accord-1-5L"], ["Accord e:HEV", "Hybrid sedan", "cars/New-Accord-eHEV"], ["HR-V", "Crossover SUV", "crossover-suv/Hrv-new"],
    ["ZR-V", "Crossover SUV", "crossover-suv/ZR-V"], ["CR-V", "SUV", "crossover-suv/All-New-CR-V"], ["Pilot", "SUV", "crossover-suv/New-Pilot"], ["Odyssey", "Minivan", "minivan/Odyssey-New"],
  ].map(([name, body, path]) => ({ brand: "Honda" as const, name, body, href: `https://honda-mideast.com/en-ae/automobiles/${path}` })),
  ...["IS", "ES", "LS", "UX", "NX", "RX", "GX", "LX", "LM", "RZ"].map((name) => ({ brand: "Lexus" as const, name, body: "Lexus model", href: "https://www.alfuttaim.com/en/our-brands/lexus/" })),
  ...["EX30", "EX40", "EC40", "EX90", "XC40", "XC60", "XC90", "S90"].map((name) => ({ brand: "Volvo" as const, name, body: "Volvo model", href: "https://www.volvocarsuae.ae/en/" })),
  ...["ATTO 3", "SEAL", "SEALION 7", "HAN", "TANG", "SONG PLUS", "QIN PLUS", "SHARK 6"].map((name) => ({ brand: "BYD" as const, name, body: "BYD model", href: "https://www.alfuttaim.com/en/our-brands/byd/" })),
];

export default function Home() {
  const [journey, setJourney] = useState<Journey>("moving");
  const [emirate, setEmirate] = useState("Dubai");
  const homeType = "Apartment";
  const [propertyIntent, setPropertyIntent] = useState<PropertyIntent>("either");
  const [bedroomPreference, setBedroomPreference] = useState("Any");
  const vehicleMake: VehicleMake = "Any make";
  const medicalCover: MedicalCover = "not-sure";
  const retailCategory: RetailCategory = "clothing";
  const [chatRequest, setChatRequest] = useState("");
  const requestInputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedNeeds, setSelectedNeeds] = useState<Need[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [submittedSearch, setSubmittedSearch] = useState<SearchCriteria | null>(null);
  const [searchCount, setSearchCount] = useState(0);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  const resultJourney = submittedSearch?.journey ?? journey;
  const resultEmirate = submittedSearch?.emirate ?? emirate;
  const resultHomeType = submittedSearch?.homeType ?? homeType;
  const resultPropertyIntent = submittedSearch?.propertyIntent ?? propertyIntent;
  const resultBedroomPreference = submittedSearch?.bedroomPreference ?? bedroomPreference;
  const resultNeeds = submittedSearch?.selectedNeeds ?? selectedNeeds;
  const resultVehicleMake = submittedSearch?.vehicleMake ?? vehicleMake;
  const resultVehiclePriceMin = submittedSearch?.vehiclePriceMin ?? null;
  const resultVehiclePriceMax = submittedSearch?.vehiclePriceMax ?? null;
  const resultMedicalCover = submittedSearch?.medicalCover ?? medicalCover;
  const resultRetailCategory = submittedSearch?.retailCategory ?? retailCategory;
  const resultGiftCategory = submittedSearch?.giftCategory ?? "all";
  useEffect(() => {
    if (showResults && searchCount > 0) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchCount, showResults]);

  const recommendations = useMemo(() => {
    const matches: Recommendation[] = [];
    if (resultNeeds.includes("gift")) {
      for (const store of giftStores.filter((item) => resultGiftCategory === "all" || item.categories.includes(resultGiftCategory as Exclude<GiftCategory, "all" | "jewelry" | "beauty" | "spa">))) {
        matches.push({
          brand: store.brand,
          label: `Gift ideas · ${store.categories.map((category) => category[0].toUpperCase() + category.slice(1)).join(", ")}`,
          title: `Explore gifts at ${store.brand}`,
          description: store.description,
          reason: `${resultGiftCategory === "all" ? "Gift ideas" : resultGiftCategory} · ${resultEmirate}`,
          tag: "Al-Futtaim brand",
          href: store.href,
          cta: `Visit ${store.brand}`,
        });
      }
    }
    if (resultNeeds.includes("retail")) {
      for (const brand of retailBrands.filter((item) => item.categories.includes(resultRetailCategory))) {
        matches.push({
          brand: brand.brand,
          label: `${resultRetailCategory === "shoes" ? "Footwear" : "Clothing"} · UAE online store`,
          title: `Shop ${brand.brand}`,
          description: brand.description,
          reason: `${resultRetailCategory === "shoes" ? "Shoes" : "Clothing"} · ${resultEmirate}`,
          tag: brand.tag,
          href: brand.href,
          cta: `Shop ${brand.brand}`,
        });
      }
    }
    if (resultNeeds.includes("school-supplies")) {
      matches.push({
        brand: "Toys\"R\"Us UAE",
        label: "School essentials · Al-Futtaim Retail",
        title: "Browse school essentials",
        description: "Toys\"R\"Us is part of Al-Futtaim Retail. Browse its UAE store and check which school supplies are currently available.",
        reason: `School supplies · ${resultEmirate}`,
        tag: "Al-Futtaim Retail",
        href: "https://toysrusmena.com/",
        cta: "Visit Toys\"R\"Us UAE",
      });
    }
    if (resultNeeds.includes("medical")) {
      const coverLabel = resultMedicalCover === "not-sure"
        ? "Individual or family cover"
        : resultMedicalCover === "family" ? "Family cover" : "Individual cover";
      matches.push({
        brand: "Orient Insurance",
        label: "Medical insurance · UAE",
        title: "Explore medical cover with Orient",
        description: "Orient describes individual medical packages with options including inpatient, outpatient, regional and worldwide cover. For details, contact the Orient Individual Medical Team at Orient.Individualmedical@alfuttaim.com or 800 674368.",
        reason: `${coverLabel} · ${resultEmirate}`,
        tag: "Orient medical insurance",
        href: "https://www.insuranceuae.com/medical-insurance/individual/individual/",
        cta: "View plans & contact Orient",
      });
    }
    if (resultNeeds.includes("car-rental")) {
      matches.push({
        brand: "Hertz UAE",
        label: "Car rental · Al-Futtaim Automotive",
        title: "Rent a car with Hertz",
        description: "Explore short-term and long-term car rentals from Hertz UAE, part of Al-Futtaim Automotive. Check current vehicles, rates and rental terms directly with Hertz.",
        reason: `Car rental · ${resultEmirate}`,
        tag: "Al-Futtaim Automotive",
        href: "https://www.hertz.ae/",
        cta: "Explore Hertz rentals",
      });
    }
    if (resultNeeds.includes("car-insurance")) {
      matches.push({
        brand: "Orient Insurance",
        label: "Car insurance · UAE",
        title: "Explore car insurance with Orient",
        description: "Orient provides motor and vehicle cover options for UAE drivers. Confirm current eligibility, excess, optional add-ons, and pricing with the insurer before buying.",
        reason: `Car insurance · ${resultEmirate}`,
        tag: "Orient motor insurance",
        href: "https://www.insuranceuae.com/car-insurance/",
        cta: "View car insurance",
      });
    }
    if (resultNeeds.includes("car")) {
      const models = carModels.filter((model) =>
        (resultVehicleMake === "Any make" || model.brand === resultVehicleMake) &&
        (resultVehiclePriceMin == null || (model.price != null && model.price >= resultVehiclePriceMin)) &&
        (resultVehiclePriceMax == null || (model.price != null && model.price <= resultVehiclePriceMax))
      );
      for (const model of models) {
        matches.push({
          brand: `${model.brand} ${model.name}`,
          label: `${model.body} · ${model.brand} UAE range`,
          title: model.name,
          description: model.price == null
            ? `${model.name} is listed in ${model.brand}’s UAE range. Confirm current grades, pricing, and availability on the official site.`
            : `${model.body} from the ${model.brand} UAE new-car range. The listed starting price can change; confirm current grade and availability with the official site.`,
          reason: `${resultEmirate} · ${resultVehicleMake === "Any make" ? "Al-Futtaim vehicle portfolio" : `${resultVehicleMake} preference`}`,
          tag: model.price == null ? "Official UAE model listing" : "Published UAE starting price",
          href: model.href,
          cta: `View ${model.brand} ${model.name}`,
          ...(model.price == null ? {} : { price: `From AED ${model.price.toLocaleString("en-AE")}` }),
        });
      }
    }
    if (resultNeeds.includes("property")) {
      if (resultEmirate === "Dubai" && resultHomeType !== "Villa / townhouse") {
        const requestedBedrooms = resultBedroomPreference === "Any" ? null : Number(resultBedroomPreference);
        const offers = propertyOffers.filter((offer) =>
          (resultPropertyIntent === "either" || offer.intent === resultPropertyIntent) &&
          (requestedBedrooms === null || offer.bedrooms.includes(requestedBedrooms))
        );

        for (const offer of offers) {
          matches.push({
            brand: offer.brand,
            label: offer.label,
            title: offer.title,
            description: offer.description,
            reason: `${offer.intent === "rent" ? "Rent" : "Buy"} · ${resultBedroomPreference === "Any" ? "any bedrooms" : `${resultBedroomPreference} bedroom${resultBedroomPreference === "1" ? "" : "s"}`} · Dubai`,
            tag: offer.tag,
            href: offer.href,
            cta: `View ${offer.brand}`,
          });
        }
      }
    } else if (resultJourney === "renovating") {
      matches.push({
        brand: "ACE",
        provider: "ACE",
        label: "Home improvement concept",
        title: "Plan your project with the right essentials",
        description: "Explore tools, materials and home-improvement essentials around the project you have in mind. Product selection and availability need confirmation with ACE.",
        reason: `${journeyLabels[resultJourney]} · ${resultEmirate}`,
        tag: "Concept recommendation",
        cta: "Preview ACE handoff",
      });
    } else if (resultNeeds.includes("furnishings")) {
      matches.push({
        brand: "IKEA",
        provider: "IKEA",
        label: "Home furnishing",
        title: resultJourney === "refreshing" ? "Give one room a fresh start" : "A room-by-room furnishing shortlist",
        description: resultJourney === "refreshing"
          ? "Explore furniture, lighting and storage ideas for the room you want to refresh. Product selection and availability need confirmation with IKEA."
          : "Explore furniture and storage ideas around the rooms you want to make work better.",
        reason: `${journeyLabels[resultJourney]} · ${resultHomeType.toLowerCase()} · ${resultEmirate}`,
        tag: "Concept recommendation",
        cta: "Preview IKEA handoff",
      });
    }
    if (!resultNeeds.includes("property") && resultJourney !== "renovating" && resultNeeds.includes("improvement")) {
      matches.push({
        brand: "ACE",
        provider: "ACE",
        label: "Home improvement",
        title: "A practical home essentials shortlist",
        description: "Explore tools, hardware and everyday essentials for the jobs on your list.",
        reason: `${journeyLabels[resultJourney]} · ${resultEmirate}`,
        tag: "Concept recommendation",
        cta: "Preview ACE handoff",
      });
    }
    return matches;
  }, [resultBedroomPreference, resultEmirate, resultGiftCategory, resultHomeType, resultJourney, resultMedicalCover, resultNeeds, resultPropertyIntent, resultRetailCategory, resultVehicleMake, resultVehiclePriceMax, resultVehiclePriceMin]);

  const noMatchTitle = resultNeeds.includes("medical")
    ? "No medical insurance referral is available."
    : resultNeeds.includes("car-insurance")
      ? "No car insurance referral is available."
    : resultNeeds.includes("gift")
      ? "No connected Al-Futtaim gift shop for that category yet."
    : resultNeeds.includes("car-rental")
      ? "No car rental options are available."
    : resultNeeds.includes("unsupported")
      ? "This request isn’t connected yet."
    : resultNeeds.includes("retail")
      ? "No retail matches are available."
    : resultNeeds.includes("car")
    ? "No vehicle options match this search yet."
    : resultNeeds.includes("property")
    ? resultEmirate !== "Dubai"
      ? `No verified property match in ${resultEmirate} yet.`
      : resultHomeType === "Villa / townhouse"
        ? "No verified villa options yet."
        : "No verified properties match these filters yet."
    : resultNeeds.length === 0
      ? "Choose what you need to get started."
      : "No verified match for that need yet.";
  const noMatchDescription = resultNeeds.includes("medical")
    ? "Check Orient Insurance’s official UAE medical-insurance page for current contact details."
    : resultNeeds.includes("car-insurance")
      ? "Check Orient Insurance’s official motor-insurance page for current cover options, excess, and eligibility details."
    : resultNeeds.includes("gift")
      ? "Jewellery, beauty products, perfume, and spa vouchers are not connected to verified Al-Futtaim stores in this prototype. Try watches, fashion, home, toys, or electronics."
    : resultNeeds.includes("car-rental")
      ? "Check Hertz UAE directly for current rental vehicles and rates."
    : resultNeeds.includes("unsupported")
      ? "This prototype doesn’t yet have verified recommendations for rental cars or school supplies."
    : resultNeeds.includes("retail")
      ? "Try another shopping category. Brand links take you to the official UAE stores."
    : resultNeeds.includes("car")
    ? resultVehiclePriceMin !== null || resultVehiclePriceMax !== null
      ? "No model with a published UAE starting price matches that budget. Models without published prices are not included in price-filtered results."
      : "Try another make or check the official UAE brand pages. Vehicle stock and test-drive availability are not connected here."
    : resultNeeds.includes("property")
    ? resultEmirate !== "Dubai"
      ? "The property offers currently verified in this prototype are in Dubai Festival City. No location match is confirmed here."
      : resultHomeType === "Villa / townhouse"
        ? "The checked Dubai Festival City offers are apartments and duplexes; no villa listing is verified here."
        : "No checked sale or rental offer matches this bedroom and tenure combination. Try another filter or check the official property pages."
    : resultNeeds.length === 0
      ? "Select at least one need to see relevant options."
      : "We haven’t connected a verified option for these needs yet.";
  const resultsHeading = resultNeeds.includes("medical")
    ? "Medical cover to explore"
    : resultNeeds.includes("car") && resultNeeds.includes("car-insurance")
      ? "Cars and insurance to explore"
    : resultNeeds.includes("car-insurance")
      ? "Car insurance to explore"
    : resultNeeds.includes("gift")
      ? resultGiftCategory === "unsupported" ? "Gift category not connected" : resultGiftCategory === "all" ? "Gift ideas to explore" : `${resultGiftCategory[0].toUpperCase()}${resultGiftCategory.slice(1)} gifts to explore`
    : resultNeeds.includes("school-supplies")
      ? "School supplies to explore"
    : resultNeeds.includes("car-rental")
      ? "Cars to rent"
    : resultNeeds.includes("retail")
      ? resultRetailCategory === "shoes" ? "Shoes to shop" : "Clothes to shop"
    : resultNeeds.includes("car")
    ? resultVehicleMake === "Any make" ? "Cars to explore" : `${resultVehicleMake} cars to explore`
    : resultNeeds.includes("property")
    ? resultPropertyIntent === "rent"
      ? "Homes for rent"
      : resultPropertyIntent === "buy"
        ? "Homes to buy"
        : "Property options"
    : resultJourney === "refreshing"
      ? "Room refresh ideas"
      : resultJourney === "renovating"
        ? "Improvement project ideas"
        : "A few places to start.";
  const resultsSummary = resultNeeds.includes("medical")
    ? `${resultMedicalCover === "not-sure" ? "Individual or family" : resultMedicalCover === "family" ? "Family" : "Individual"} medical cover · ${resultEmirate}`
    : resultNeeds.includes("car") && resultNeeds.includes("car-insurance")
      ? `${resultVehicleMake === "Any make" ? "Al-Futtaim automotive brands" : resultVehicleMake} · New cars · Motor cover · ${resultEmirate}`
    : resultNeeds.includes("car-insurance")
      ? `Motor cover · UAE · ${resultEmirate}`
    : resultNeeds.includes("gift")
      ? `${resultGiftCategory === "unsupported" ? "No verified match" : resultGiftCategory === "all" ? "Verified Al-Futtaim retail brands" : resultGiftCategory} · ${resultEmirate}`
    : resultNeeds.includes("school-supplies")
      ? `Toys\"R\"Us UAE · ${resultEmirate}`
    : resultNeeds.includes("car-rental")
      ? `Hertz UAE car rentals · ${resultEmirate}`
    : resultNeeds.includes("retail")
      ? `${resultRetailCategory === "shoes" ? "Shoes" : "Clothing"} · UAE stores · ${resultEmirate}`
    : resultNeeds.includes("car")
    ? `${resultVehicleMake === "Any make" ? "Al-Futtaim automotive brands" : resultVehicleMake} · New cars${resultVehiclePriceMin !== null || resultVehiclePriceMax !== null ? ` · ${resultVehiclePriceMin !== null ? `From AED ${resultVehiclePriceMin.toLocaleString("en-AE")}` : ""}${resultVehiclePriceMin !== null && resultVehiclePriceMax !== null ? " to " : ""}${resultVehiclePriceMax !== null ? `up to AED ${resultVehiclePriceMax.toLocaleString("en-AE")}` : ""}` : ""} · ${resultEmirate}`
    : resultNeeds.includes("property")
    ? `${resultPropertyIntent === "either" ? "Rent or buy" : resultPropertyIntent} · ${resultBedroomPreference === "Any" ? "Any bedrooms" : resultBedroomPreference === "5+" ? "5+ bedrooms" : `${resultBedroomPreference} bedroom${resultBedroomPreference === "1" ? "" : "s"}`} · ${resultHomeType === "Not sure yet" ? "Any home type" : resultHomeType} · ${resultEmirate}`
    : `Based on what you shared: ${journeyLabels[resultJourney].toLowerCase()}.`;

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = chatRequest.trim();
    if (!request) return;

    const normalized = request.toLowerCase();
    const mentionedMake = vehicleMakes.find((make) => new RegExp(`\\b${make.toLowerCase()}\\b`).test(normalized));
    const amountValue = (amount: string, unit?: string) => Math.round(Number(amount.replace(/,/g, "")) * (unit === "k" ? 1000 : unit === "m" ? 1000000 : 1));
    const priceRange = normalized.match(/\bbetween\s+(?:aed\s*)?([\d,]+)\s*(k|m)?\s+and\s+(?:aed\s*)?([\d,]+)\s*(k|m)?/);
    const maxPriceMatch = normalized.match(/\b(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?|within)\s*(?:aed\s*)?([\d,]+(?:\.\d+)?)\s*(k|m)?/);
    const minPriceMatch = normalized.match(/\b(?:over|above|more than|at least|from)\s*(?:aed\s*)?([\d,]+(?:\.\d+)?)\s*(k|m)?/);
    const currencyPriceMatch = normalized.match(/\baed\s*([\d,]+(?:\.\d+)?)\s*(k|m)?/);
    const inferredPriceMin = priceRange ? amountValue(priceRange[1], priceRange[2]) : minPriceMatch ? amountValue(minPriceMatch[1], minPriceMatch[2]) : null;
    const inferredPriceMax = priceRange ? amountValue(priceRange[3], priceRange[4]) : maxPriceMatch ? amountValue(maxPriceMatch[1], maxPriceMatch[2]) : null;
    const hasCarPrice = inferredPriceMin !== null || inferredPriceMax !== null || currencyPriceMatch !== null;
    const finalPriceMin = inferredPriceMin;
    const finalPriceMax = inferredPriceMax ?? (currencyPriceMatch ? amountValue(currencyPriceMatch[1], currencyPriceMatch[2]) : null);
    const bedroomMatch = normalized.match(/\b(\d+|one|two|three|four|five)\s*(?:bed(?:room)?s?|br)\b/);
    const bedroomNumbers: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    const requestedBedrooms = bedroomMatch
      ? Number(bedroomMatch[1].replace(/\D/g, "") || bedroomNumbers[bedroomMatch[1]])
      : null;
    const detectedEmirate = supportedEmirates.find((name) => normalized.includes(name.toLowerCase()));
    const buyingHome = /\b(?:buy|purchase)\b.{0,30}\b(?:home|house|property|apartment|villa)\b|\b(?:home|house|property|apartment|villa)\b.{0,30}\b(?:buy|purchase)\b/.test(normalized);
    const rentingHome = /\b(?:rent|rental|lease)\b.{0,30}\b(?:home|house|property|apartment|villa)\b|\b(?:home|house|property|apartment|villa)\b.{0,30}\b(?:rent|rental|lease)\b/.test(normalized);
    const buyingIntent = /\b(?:to buy|buy|purchase|for sale)\b/.test(normalized);
    const rentingIntent = /\b(?:to rent|rent|rental|lease|for rent)\b/.test(normalized);
    const bedroomPropertySearch = requestedBedrooms !== null && (buyingIntent || rentingIntent);
    const inferredPropertyIntent: PropertyIntent = buyingHome || (bedroomPropertySearch && buyingIntent)
      ? "buy"
      : rentingHome || (bedroomPropertySearch && rentingIntent) ? "rent" : propertyIntent;
    const hasCarInsuranceRequest = /\b(?:car|vehicle|motor|auto)\b.{0,20}\b(?:insurance|cover|policy)\b|\b(?:insurance|cover|policy)\b.{0,20}\b(?:car|vehicle|motor|auto)\b/.test(normalized);
    const inferredNeed = resolveRequestNeed(normalized, {
      hasSchoolSupplies: /school[\s-]*suppl(?:y|ies)|stationery|back[\s-]*to[\s-]*school/.test(normalized),
      hasGift: isGiftRequest(normalized),
      hasCarRental: /\b(?:rent|rental|hire|lease)\b.{0,20}\b(?:car|vehicle)\b|\b(?:car|vehicle)\b.{0,20}\b(?:rent|rental|hire|lease)\b/.test(normalized),
      hasCarInsurance: hasCarInsuranceRequest,
      hasMedical: /\b(?:medical|health|healthcare|hospital|clinic|doctor|dentist|wellness)\b/.test(normalized)
        || /(?:medical|health)\s+(?:insurance|cover|plan|policy)/.test(normalized),
      hasProperty: buyingHome || rentingHome || bedroomPropertySearch,
      hasCar: mentionedMake !== undefined || hasCarPrice || /\bcar\b|\bvehicle\b/.test(normalized),
    });
    const inferredNeeds: Need[] = hasCarInsuranceRequest && (inferredNeed === "car" || inferredNeed === "car-insurance")
      ? ["car", "car-insurance"]
      : [inferredNeed];

    const inferredJourney: Journey = /renovat|repair|fix|improv|tool|paint/.test(normalized)
      ? "renovating"
      : /refresh|update|new look/.test(normalized) ? "refreshing" : "moving";
    const search: SearchCriteria = {
      journey: inferredJourney,
      emirate: detectedEmirate ?? emirate,
      homeType,
      propertyIntent: inferredPropertyIntent,
      bedroomPreference: requestedBedrooms === null ? bedroomPreference : requestedBedrooms >= 5 ? "5+" : String(requestedBedrooms),
      selectedNeeds: inferredNeeds,
      vehicleMake: mentionedMake ?? vehicleMake,
      vehiclePriceMin: finalPriceMin,
      vehiclePriceMax: finalPriceMax,
      medicalCover,
      retailCategory,
      giftCategory: resolveGiftCategory(normalized),
    };
    setJourney(inferredJourney);
    if (detectedEmirate) setEmirate(detectedEmirate);
    setPropertyIntent(inferredPropertyIntent);
    if (requestedBedrooms !== null) setBedroomPreference(requestedBedrooms >= 5 ? "5+" : String(requestedBedrooms));
    setSelectedNeeds(inferredNeeds);
    setSubmittedSearch(search);
    setShowResults(true);
    setSearchCount((count) => count + 1);
  }

  function handleRequestKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function editAnswers() {
    setShowResults(false);
    window.requestAnimationFrame(() => {
      requestInputRef.current?.focus({ preventScroll: true });
      requestInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function chooseNextNeed(need: Need) {
    const nextRequest: Record<Need, string> = {
      furnishings: "Help me furnish a room",
      improvement: "I want to improve my home",
      property: "Find a home to rent or buy",
      planning: "Help me find the right next step",
      car: "I want to buy a car",
      "car-insurance": "I need car insurance",
      "car-rental": "I want to rent a car",
      medical: "I need medical insurance",
      retail: "I want to shop for clothes or shoes",
      "school-supplies": "I need school supplies",
      gift: "I want to buy a gift",
      unsupported: "Help me find a service",
    };
    setChatRequest(nextRequest[need]);
    setShowResults(false);
    window.requestAnimationFrame(() => {
      requestInputRef.current?.focus({ preventScroll: true });
      requestInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function openHandoff(selectedProvider: Provider) {
    setProvider(selectedProvider);
    setSubmitted(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#top" aria-label="Al-Futtaim concierge">
          <span className="brand-mark">af</span>
          <span className="brand-name">Al-Futtaim <span>PERSONAL CONCIERGE</span></span>
        </a>
        <div className="topbar-right"><span className="availability-dot" /> UAE · Prototype</div>
      </header>

      <section className="intro" id="top">
        <div className="intro-chat">
          <p className="eyebrow"><span>01</span> AL-FUTTAIM PERSONAL CONCIERGE</p>
          <h1>How can we help?</h1>
          <p className="intro-text">Tell us what you’re looking for and we’ll find a relevant place to start.</p>
          <form className="request-form" onSubmit={handleRequestSubmit}>
            <label className="visually-hidden" htmlFor="concierge-request">Describe what you need</label>
            <textarea
              ref={requestInputRef}
              id="concierge-request"
              className="request-input"
              value={chatRequest}
              onChange={(event) => setChatRequest(event.target.value)}
              onKeyDown={handleRequestKeyDown}
              placeholder="I’m looking for a two-bedroom apartment in Dubai..."
              rows={3}
            />
            <div className="request-suggestions" aria-label="Suggested requests">
              <span>TRY ASKING</span>
              {requestSuggestions.map((suggestion) => (
                <button
                  className="request-suggestion"
                  type="button"
                  key={suggestion}
                  onClick={() => {
                    setChatRequest(suggestion);
                    requestInputRef.current?.focus();
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <button className="primary-button request-send" type="submit" disabled={!chatRequest.trim()}>
              Find options <span aria-hidden="true">↗</span>
            </button>
          </form>
          <div className="intro-note"><span className="note-rule" />A few thoughtful questions. No account needed.</div>
        </div>
      </section>

      {showResults && <section ref={resultsRef} className="results" aria-live="polite" aria-labelledby="results-heading">
        <div className="results-header"><div><p className="eyebrow">A FIRST LOOK · {resultEmirate.toUpperCase()}</p><h2 id="results-heading">{resultsHeading}</h2><p className="results-subtitle">{resultsSummary}</p></div><button type="button" className="text-button" onClick={editAnswers}>Edit answers <span aria-hidden="true">↗</span></button></div>
        {recommendations.length > 0 ? <>
        <p className="results-count" role="status">{recommendations.length} {resultNeeds.includes("gift") ? recommendations.length === 1 ? "gift shop" : "gift shops" : resultNeeds.includes("property") ? recommendations.length === 1 ? "property" : "properties" : resultNeeds.includes("car-rental") ? recommendations.length === 1 ? "rental option" : "rental options" : resultNeeds.includes("car") ? recommendations.length === 1 ? "car option" : "car options" : resultNeeds.includes("car-insurance") ? recommendations.length === 1 ? "car insurance option" : "car insurance options" : resultNeeds.includes("medical") ? recommendations.length === 1 ? "medical cover option" : "medical cover options" : resultNeeds.includes("retail") ? recommendations.length === 1 ? "store" : "stores" : recommendations.length === 1 ? "option" : "options"} {recommendations.length === 1 ? "matches" : "match"} your search</p>
        <div className="recommendation-grid">{recommendations.map((item) => <article className="recommendation" key={item.brand}>
          <div className="recommendation-top"><span className="provider-wordmark">{item.brand}</span><span className="concept-tag">{item.tag}</span></div>
          <p className="recommendation-label">{item.label}</p><h3>{item.title}</h3><p className="recommendation-description">{item.description}</p>
          {item.price && <p className="vehicle-price">{item.price}<span> · listed starting price</span></p>}
          <div className="match-reason"><span className="match-icon">↳</span><span><strong>Why this appeared</strong>{item.reason}</span></div>
          {resultNeeds.includes("retail")
            ? <p className="availability-note">Products, sizes, prices, and stock are shown and confirmed by the retailer’s official store.</p>
            : resultNeeds.includes("gift")
            ? <p className="availability-note">This is an Al-Futtaim brand destination, not live gift inventory. Confirm suitable products, gifting options, and stock with the store.</p>
            : resultNeeds.includes("school-supplies")
            ? <p className="availability-note">Al-Futtaim operates Toys&apos;R&apos;Us, but school-supply assortment and stock should be checked with the store.</p>
            : resultNeeds.includes("medical")
            ? <p className="availability-note">Orient’s medical team can explain plan benefits, network, eligibility and current premiums. This prototype does not assess or quote cover.</p>
            : resultNeeds.includes("car-insurance")
            ? <p className="availability-note">Motor policies, excess, and optional extras vary by driver profile and vehicle. Confirm current coverage details with the insurer.</p>
            : resultNeeds.includes("car-rental")
            ? <p className="availability-note">Rental vehicles, rates, terms, and availability are confirmed by Hertz UAE.</p>
            : resultNeeds.includes("car")
            ? <p className="availability-note">Prices, trims, and vehicle availability can change. Confirm current details with the official UAE brand site.</p>
            : item.href
              ? <p className="availability-note">Unit-level availability and prices can change. Check the official property page for current details.</p>
              : <p className="availability-note">Availability and service details for {resultEmirate} need confirmation.</p>}
          {item.href ? <a className="secondary-button" href={item.href} target="_blank" rel="noreferrer">{item.cta} <span aria-hidden="true">↗</span></a> : <button type="button" className="secondary-button" onClick={() => item.provider && openHandoff(item.provider)}>{item.cta} <span aria-hidden="true">↗</span></button>}
        </article>)}</div></> : resultNeeds.includes("planning") ? <div className="next-step-panel">
          <div className="no-match"><span className="no-match-mark">↳</span><div><h3>Let’s narrow it down.</h3><p>Choose the area you’d like to explore first. We’ll use it to shape your options.</p></div></div>
          <div className="next-step-options">
            <button type="button" className="secondary-button" onClick={() => chooseNextNeed("property")}>Find a property <span aria-hidden="true">↗</span></button>
            <button type="button" className="secondary-button" onClick={() => chooseNextNeed("furnishings")}>Furnish a room <span aria-hidden="true">↗</span></button>
            <button type="button" className="secondary-button" onClick={() => chooseNextNeed("improvement")}>Improve a home <span aria-hidden="true">↗</span></button>
          </div>
        </div> : <div className="no-match"><span className="no-match-mark">—</span><div><h3>{noMatchTitle}</h3><p>{noMatchDescription} Your selection hasn’t been sent anywhere.</p></div></div>}
        {recommendations.length > 0 && resultNeeds.includes("planning") && <p className="unmatched-note">Broader planning is not connected to a verified option here yet, so we have left it unmatched.</p>}
        <p className="prototype-disclaimer">{resultNeeds.includes("gift") ? "Gift results link to brands in Al-Futtaim’s retail portfolio. Store links do not confirm particular products, gift cards, or live stock. Jewelry, beauty, perfume, and spa vouchers are not currently connected." : resultNeeds.includes("school-supplies") ? "Toys'R'Us is listed in Al-Futtaim Retail’s published brand portfolio. Check the UAE store for current school-supply products and availability." : resultNeeds.includes("retail") ? "Brand affiliations are based on Al-Futtaim’s published retail portfolio. Shopping links open the brands’ UAE online stores; products and stock are managed by each retailer." : resultNeeds.includes("medical") ? "Orient is the insurer and must confirm product terms, eligibility, benefits, network, and premiums. No medical information is collected or sent by this prototype." : resultNeeds.includes("car-insurance") ? "Motor cover terms, eligibility, and pricing vary by policy and driver profile. This prototype does not quote or bind insurance." : resultNeeds.includes("car") ? "Links go to official brand pages. Published starting prices may change; vehicle stock, trim availability, and test drives are not connected to this prototype." : "Prototype concepts only. These are not confirmed offers, live availability, or a promise of service. Validate each option with its provider before launch."}</p>
      </section>}

      <footer className="footer"><span>AL-FUTTAIM · PERSONAL CONCIERGE</span><span>BUILT AROUND WHAT MATTERS TO YOU</span></footer>

      {provider && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProvider(null); }}>
        <section className="handoff-modal" role="dialog" aria-modal="true" aria-labelledby="handoff-title">
          <button className="modal-close" type="button" aria-label="Close" onClick={() => setProvider(null)}>×</button>
          {!submitted ? <>
            <p className="eyebrow">DEMO HANDOFF · {provider}</p><h2 id="handoff-title">Would you like {provider} to get in touch?</h2><p className="modal-copy">This is a demonstration of the consent step. No information will be sent to {provider} or stored.</p>
            <form onSubmit={handleSubmit}>
              <label className="modal-input-label">Your name<input required name="name" autoComplete="name" placeholder="Name" /></label>
              <label className="modal-input-label">Email address<input required name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label>
              <label className="consent-row"><input required type="checkbox" /><span>I agree to share my name and email with {provider} so they can follow up about this home-related enquiry. I understand this is a prototype and no data will actually be sent.</span></label>
              <button className="primary-button modal-submit" type="submit">Preview consent <span aria-hidden="true">↗</span></button>
            </form>
          </> : <div className="success-state"><span className="success-mark">✓</span><p className="eyebrow">DEMO ONLY</p><h2 id="handoff-title">Consent preview complete.</h2><p>Your details stayed in this browser and were not sent or stored.</p><button type="button" className="secondary-button" onClick={() => setProvider(null)}>Back to recommendations</button></div>}
        </section>
      </div>}
    </main>
  );
}