export const SWEDISH_CITIES = [
  // Stockholms län
  "Stockholm",
  "Södertälje",
  "Täby",
  "Solna",
  "Sundbyberg",
  "Järfälla",
  "Nacka",
  "Tyresö",
  "Botkyrka",
  "Huddinge",
  "Lidingö",
  "Haninge",
  "Värmdö",
  "Sollentuna",
  "Sigtuna",
  "Upplands Väsby",
  "Vallentuna",
  "Norrtälje",
  "Österåker",
  "Nykvarn",
  // Uppsala län
  "Uppsala",
  "Enköping",
  "Bålsta",
  "Knivsta",
  "Tierp",
  "Östhammar",
  // Södermanlands län
  "Eskilstuna",
  "Nyköping",
  "Strängnäs",
  "Katrineholm",
  "Flen",
  "Trosa",
  // Östergötlands län
  "Linköping",
  "Norrköping",
  "Motala",
  "Mjölby",
  "Finspång",
  "Söderköping",
  // Jönköpings län
  "Jönköping",
  "Huskvarna",
  "Tranås",
  "Vetlanda",
  "Värnamo",
  "Eksjö",
  "Nässjö",
  "Gislaved",
  // Kronobergs län
  "Växjö",
  "Ljungby",
  "Älmhult",
  "Alvesta",
  "Tingsryd",
  // Kalmar län
  "Kalmar",
  "Oskarshamn",
  "Västervik",
  "Vimmerby",
  "Nybro",
  "Borgholm",
  // Gotlands län
  "Visby",
  // Blekinge län
  "Karlskrona",
  "Karlshamn",
  "Ronneby",
  "Sölvesborg",
  // Skåne län
  "Malmö",
  "Lund",
  "Helsingborg",
  "Kristianstad",
  "Hässleholm",
  "Trelleborg",
  "Ystad",
  "Ängelholm",
  "Landskrona",
  "Vellinge",
  "Eslöv",
  "Höganäs",
  "Kävlinge",
  "Staffanstorp",
  "Burlöv",
  "Skurup",
  "Sjöbo",
  "Perstorp",
  // Hallands län
  "Halmstad",
  "Kungsbacka",
  "Varberg",
  "Falkenberg",
  "Laholm",
  // Västra Götalands län
  "Göteborg",
  "Borås",
  "Mölndal",
  "Trollhättan",
  "Skövde",
  "Uddevalla",
  "Kungälv",
  "Lidköping",
  "Lerum",
  "Partille",
  "Stenungsund",
  "Alingsås",
  "Vänersborg",
  "Falköping",
  "Mariestad",
  "Lysekil",
  "Strömstad",
  "Åmål",
  "Herrljunga",
  // Värmlands län
  "Karlstad",
  "Kristinehamn",
  "Arvika",
  "Säffle",
  "Filipstad",
  "Sunne",
  "Hagfors",
  // Örebro län
  "Örebro",
  "Karlskoga",
  "Kumla",
  "Hallsberg",
  "Nora",
  "Lindesberg",
  // Västmanlands län
  "Västerås",
  "Sala",
  "Köping",
  "Arboga",
  "Fagersta",
  "Kungsör",
  "Hallstahammar",
  // Dalarnas län
  "Falun",
  "Borlänge",
  "Mora",
  "Ludvika",
  "Avesta",
  "Hedemora",
  "Leksand",
  "Rättvik",
  "Malung",
  "Orsa",
  // Gävleborgs län
  "Gävle",
  "Sandviken",
  "Söderhamn",
  "Bollnäs",
  "Hudiksvall",
  "Ljusdal",
  // Västernorrlands län
  "Sundsvall",
  "Härnösand",
  "Kramfors",
  "Sollefteå",
  "Örnsköldsvik",
  "Timrå",
  // Jämtlands län
  "Östersund",
  "Åre",
  "Strömsund",
  "Krokom",
  // Västerbottens län
  "Umeå",
  "Skellefteå",
  "Lycksele",
  "Vilhelmina",
  "Storuman",
  // Norrbottens län
  "Luleå",
  "Kiruna",
  "Boden",
  "Gällivare",
  "Piteå",
  "Kalix",
  "Älvsbyn",
  "Haparanda",
  "Arvidsjaur",
  "Jokkmokk",
].sort((a, b) => a.localeCompare(b, "sv"));

export type JobType = "furniture_transport" | "bulky_delivery" | "junk_pickup";

export function calculatePrice(jobType: JobType, distanceKm: number): {
  priceTotal: number;
  driverPayout: number;
  platformFee: number;
  basePrice: number;
  rateKm: number;
} {
  let basePrice: number;
  let ratePerKm: number;
  let minimum: number;

  switch (jobType) {
    case "furniture_transport":
      basePrice = 299;
      ratePerKm = 15;
      minimum = 349;
      break;
    case "bulky_delivery":
      basePrice = 249;
      ratePerKm = 12;
      minimum = 299;
      break;
    case "junk_pickup":
    default:
      basePrice = 199;
      ratePerKm = 10;
      minimum = 249;
      break;
  }

  const priceTotal = Math.max(minimum, basePrice + distanceKm * ratePerKm);
  const rounded = Math.round(priceTotal);
  const driverPayout = Math.round(rounded * 0.75);
  const platformFee = Math.round(rounded * 0.25);

  return { priceTotal: rounded, driverPayout, platformFee, basePrice, rateKm: ratePerKm };
}

export function formatSEK(amount: number): string {
  return `${amount.toLocaleString("sv-SE")} kr`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "Not specified";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Fee charged to customer when they cancel AFTER a driver has accepted.
// Must match CANCELLATION_FEE_AFTER_ACCEPTANCE in the API server.
export const CANCELLATION_FEE = 150;

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending":               return "#8B9CBD";
    case "accepted":              return "#4A9EE8";
    case "arrived":               return "#A47FE8";
    case "in_progress":           return "#E87A2A";
    case "completed":             return "#4CAF82";
    case "cancelled":             return "#E05252";
    case "cancelled_by_customer": return "#E05252";
    case "disputed":              return "#C9A84C";
    default:                      return "#8B9CBD";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":               return "Pending";
    case "accepted":              return "Accepted";
    case "arrived":               return "Driver Arrived";
    case "in_progress":           return "In Progress";
    case "completed":             return "Completed";
    case "cancelled":             return "Cancelled";
    case "cancelled_by_customer": return "Cancelled (Fee Applied)";
    case "disputed":              return "Disputed";
    default:                      return status;
  }
}

export function getJobTypeLabel(jobType: string): string {
  switch (jobType) {
    case "furniture_transport": return "Furniture Transport";
    case "bulky_delivery":      return "Bulky Item Delivery";
    case "junk_pickup":         return "Junk & Trash Pickup";
    default:                    return jobType;
  }
}

function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "app.baraapp.se"}`;
}
export const BASE_URL = getBaseUrl();

export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "";

export const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  // Stockholms län
  Stockholm:         { latitude: 59.3293, longitude: 18.0686 },
  Södertälje:        { latitude: 59.1955, longitude: 17.6253 },
  Täby:              { latitude: 59.4441, longitude: 18.0689 },
  Solna:             { latitude: 59.3664, longitude: 18.0007 },
  Sundbyberg:        { latitude: 59.3614, longitude: 17.9714 },
  Järfälla:          { latitude: 59.4333, longitude: 17.8333 },
  Nacka:             { latitude: 59.3160, longitude: 18.1630 },
  Tyresö:            { latitude: 59.2441, longitude: 18.2294 },
  Botkyrka:          { latitude: 59.2000, longitude: 17.8500 },
  Huddinge:          { latitude: 59.2363, longitude: 17.9847 },
  Lidingö:           { latitude: 59.3667, longitude: 18.1500 },
  Haninge:           { latitude: 59.1667, longitude: 18.1333 },
  Värmdö:            { latitude: 59.3167, longitude: 18.5000 },
  Sollentuna:        { latitude: 59.4281, longitude: 17.9511 },
  Sigtuna:           { latitude: 59.6167, longitude: 17.7167 },
  "Upplands Väsby":  { latitude: 59.5190, longitude: 17.9120 },
  Vallentuna:        { latitude: 59.5347, longitude: 18.0786 },
  Norrtälje:         { latitude: 59.7584, longitude: 18.7060 },
  Österåker:         { latitude: 59.4833, longitude: 18.3000 },
  Nykvarn:           { latitude: 59.1747, longitude: 17.4289 },
  // Uppsala län
  Uppsala:           { latitude: 59.8586, longitude: 17.6389 },
  Enköping:          { latitude: 59.6357, longitude: 17.0768 },
  Bålsta:            { latitude: 59.5667, longitude: 17.5333 },
  Knivsta:           { latitude: 59.7257, longitude: 17.7832 },
  Tierp:             { latitude: 60.3411, longitude: 17.5152 },
  Östhammar:         { latitude: 60.2636, longitude: 18.3751 },
  // Södermanlands län
  Eskilstuna:        { latitude: 59.3706, longitude: 16.5099 },
  Nyköping:          { latitude: 58.7533, longitude: 17.0083 },
  Strängnäs:         { latitude: 59.3776, longitude: 17.0298 },
  Katrineholm:       { latitude: 58.9975, longitude: 16.2080 },
  Flen:              { latitude: 59.0557, longitude: 16.5874 },
  Trosa:             { latitude: 58.8942, longitude: 17.5499 },
  // Östergötlands län
  Linköping:         { latitude: 58.4109, longitude: 15.6219 },
  Norrköping:        { latitude: 58.5942, longitude: 16.1826 },
  Motala:            { latitude: 58.5374, longitude: 15.0367 },
  Mjölby:            { latitude: 58.3264, longitude: 15.1323 },
  Finspång:          { latitude: 58.7047, longitude: 15.7667 },
  Söderköping:       { latitude: 58.4817, longitude: 16.3244 },
  // Jönköpings län
  Jönköping:         { latitude: 57.7826, longitude: 14.1618 },
  Huskvarna:         { latitude: 57.7878, longitude: 14.2967 },
  Tranås:            { latitude: 58.0376, longitude: 14.9776 },
  Vetlanda:          { latitude: 57.4319, longitude: 15.0780 },
  Värnamo:           { latitude: 57.1836, longitude: 14.0413 },
  Eksjö:             { latitude: 57.6650, longitude: 14.9750 },
  Nässjö:            { latitude: 57.6534, longitude: 14.6945 },
  Gislaved:          { latitude: 57.3025, longitude: 13.5399 },
  // Kronobergs län
  Växjö:             { latitude: 56.8777, longitude: 14.8096 },
  Ljungby:           { latitude: 56.8330, longitude: 13.9330 },
  Älmhult:           { latitude: 56.5502, longitude: 14.1382 },
  Alvesta:           { latitude: 56.8984, longitude: 14.5575 },
  Tingsryd:          { latitude: 56.5255, longitude: 14.9757 },
  // Kalmar län
  Kalmar:            { latitude: 56.6634, longitude: 16.3566 },
  Oskarshamn:        { latitude: 57.2638, longitude: 16.4479 },
  Västervik:         { latitude: 57.7582, longitude: 16.6384 },
  Vimmerby:          { latitude: 57.6657, longitude: 15.8567 },
  Nybro:             { latitude: 56.7444, longitude: 15.9062 },
  Borgholm:          { latitude: 56.8780, longitude: 16.6540 },
  // Gotlands län
  Visby:             { latitude: 57.6348, longitude: 18.2948 },
  // Blekinge län
  Karlskrona:        { latitude: 56.1612, longitude: 15.5869 },
  Karlshamn:         { latitude: 56.1705, longitude: 14.8610 },
  Ronneby:           { latitude: 56.2091, longitude: 15.2767 },
  Sölvesborg:        { latitude: 56.0507, longitude: 14.5773 },
  // Skåne län
  Malmö:             { latitude: 55.6050, longitude: 13.0038 },
  Lund:              { latitude: 55.7047, longitude: 13.1910 },
  Helsingborg:       { latitude: 56.0467, longitude: 12.6945 },
  Kristianstad:      { latitude: 56.0294, longitude: 14.1567 },
  Hässleholm:        { latitude: 56.1583, longitude: 13.7680 },
  Trelleborg:        { latitude: 55.3753, longitude: 13.1573 },
  Ystad:             { latitude: 55.4293, longitude: 13.8200 },
  Ängelholm:         { latitude: 56.2430, longitude: 12.8621 },
  Landskrona:        { latitude: 55.8706, longitude: 12.8300 },
  Vellinge:          { latitude: 55.4720, longitude: 13.0130 },
  Eslöv:             { latitude: 55.8380, longitude: 13.3034 },
  Höganäs:           { latitude: 56.1983, longitude: 12.5649 },
  Kävlinge:          { latitude: 55.7926, longitude: 13.1124 },
  Staffanstorp:      { latitude: 55.6430, longitude: 13.2060 },
  Burlöv:            { latitude: 55.6358, longitude: 13.0972 },
  Skurup:            { latitude: 55.4785, longitude: 13.5029 },
  Sjöbo:             { latitude: 55.6255, longitude: 13.7092 },
  Perstorp:          { latitude: 56.1364, longitude: 13.3937 },
  // Hallands län
  Halmstad:          { latitude: 56.6745, longitude: 12.8577 },
  Kungsbacka:        { latitude: 57.4857, longitude: 12.0765 },
  Varberg:           { latitude: 57.1059, longitude: 12.2510 },
  Falkenberg:        { latitude: 56.9054, longitude: 12.4913 },
  Laholm:            { latitude: 56.5099, longitude: 13.0484 },
  // Västra Götalands län
  Göteborg:          { latitude: 57.7089, longitude: 11.9746 },
  Borås:             { latitude: 57.7210, longitude: 12.9401 },
  Mölndal:           { latitude: 57.6561, longitude: 12.0136 },
  Trollhättan:       { latitude: 58.2840, longitude: 12.2886 },
  Skövde:            { latitude: 58.3883, longitude: 13.8459 },
  Uddevalla:         { latitude: 58.3489, longitude: 11.9382 },
  Kungälv:           { latitude: 57.8714, longitude: 11.9840 },
  Lidköping:         { latitude: 58.5050, longitude: 13.1575 },
  Lerum:             { latitude: 57.7690, longitude: 12.2700 },
  Partille:          { latitude: 57.7380, longitude: 12.1070 },
  Stenungsund:       { latitude: 58.0773, longitude: 11.8266 },
  Alingsås:          { latitude: 57.9299, longitude: 12.5335 },
  Vänersborg:        { latitude: 58.3801, longitude: 12.3234 },
  Falköping:         { latitude: 58.1722, longitude: 13.5481 },
  Mariestad:         { latitude: 58.7095, longitude: 13.8248 },
  Lysekil:           { latitude: 58.2746, longitude: 11.4351 },
  Strömstad:         { latitude: 58.9364, longitude: 11.1680 },
  Åmål:              { latitude: 59.0530, longitude: 12.7052 },
  Herrljunga:        { latitude: 58.0796, longitude: 13.0203 },
  // Värmlands län
  Karlstad:          { latitude: 59.3793, longitude: 13.5036 },
  Kristinehamn:      { latitude: 59.3098, longitude: 14.1064 },
  Arvika:            { latitude: 59.6553, longitude: 12.5876 },
  Säffle:            { latitude: 59.1333, longitude: 12.9333 },
  Filipstad:         { latitude: 59.7133, longitude: 14.1642 },
  Sunne:             { latitude: 59.8360, longitude: 13.1412 },
  Hagfors:           { latitude: 60.0279, longitude: 13.6493 },
  // Örebro län
  Örebro:            { latitude: 59.2741, longitude: 15.2066 },
  Karlskoga:         { latitude: 59.3262, longitude: 14.5242 },
  Kumla:             { latitude: 59.1213, longitude: 15.1487 },
  Hallsberg:         { latitude: 59.0676, longitude: 15.1043 },
  Nora:              { latitude: 59.5160, longitude: 15.0320 },
  Lindesberg:        { latitude: 59.5920, longitude: 15.2280 },
  // Västmanlands län
  Västerås:          { latitude: 59.6109, longitude: 16.5448 },
  Sala:              { latitude: 59.9197, longitude: 16.6033 },
  Köping:            { latitude: 59.5140, longitude: 15.9960 },
  Arboga:            { latitude: 59.3933, longitude: 15.8383 },
  Fagersta:          { latitude: 60.0037, longitude: 15.7932 },
  Kungsör:           { latitude: 59.4238, longitude: 16.0920 },
  Hallstahammar:     { latitude: 59.6142, longitude: 16.2276 },
  // Dalarnas län
  Falun:             { latitude: 60.6065, longitude: 15.6355 },
  Borlänge:          { latitude: 60.4862, longitude: 15.4367 },
  Mora:              { latitude: 61.0050, longitude: 14.5428 },
  Ludvika:           { latitude: 60.1490, longitude: 15.1879 },
  Avesta:            { latitude: 60.1415, longitude: 16.1634 },
  Hedemora:          { latitude: 60.2763, longitude: 15.9862 },
  Leksand:           { latitude: 60.7312, longitude: 14.9991 },
  Rättvik:           { latitude: 60.8897, longitude: 15.1175 },
  Malung:            { latitude: 60.6869, longitude: 13.7230 },
  Orsa:              { latitude: 61.1202, longitude: 14.6144 },
  // Gävleborgs län
  Gävle:             { latitude: 60.6749, longitude: 17.1413 },
  Sandviken:         { latitude: 60.6193, longitude: 16.7758 },
  Söderhamn:         { latitude: 61.3020, longitude: 17.0640 },
  Bollnäs:           { latitude: 61.3475, longitude: 16.3955 },
  Hudiksvall:        { latitude: 61.7280, longitude: 17.1064 },
  Ljusdal:           { latitude: 61.8275, longitude: 16.1009 },
  // Västernorrlands län
  Sundsvall:         { latitude: 62.3913, longitude: 17.3069 },
  Härnösand:         { latitude: 62.6324, longitude: 17.9376 },
  Kramfors:          { latitude: 62.9310, longitude: 17.7960 },
  Sollefteå:         { latitude: 63.1671, longitude: 17.2693 },
  Örnsköldsvik:      { latitude: 63.2903, longitude: 18.7147 },
  Timrå:             { latitude: 62.4878, longitude: 17.3261 },
  // Jämtlands län
  Östersund:         { latitude: 63.1792, longitude: 14.6357 },
  Åre:               { latitude: 63.3983, longitude: 13.0808 },
  Strömsund:         { latitude: 63.8560, longitude: 15.5530 },
  Krokom:            { latitude: 63.3244, longitude: 14.4644 },
  // Västerbottens län
  Umeå:              { latitude: 63.8258, longitude: 20.2630 },
  Skellefteå:        { latitude: 64.7507, longitude: 20.9528 },
  Lycksele:          { latitude: 64.5956, longitude: 18.6754 },
  Vilhelmina:        { latitude: 64.6262, longitude: 16.6565 },
  Storuman:          { latitude: 65.0941, longitude: 17.1096 },
  // Norrbottens län
  Luleå:             { latitude: 65.5848, longitude: 22.1547 },
  Kiruna:            { latitude: 67.8558, longitude: 20.2253 },
  Boden:             { latitude: 65.8253, longitude: 21.6907 },
  Gällivare:         { latitude: 67.1335, longitude: 20.6535 },
  Piteå:             { latitude: 65.3172, longitude: 21.4788 },
  Kalix:             { latitude: 65.8556, longitude: 23.1376 },
  Älvsbyn:           { latitude: 65.6790, longitude: 21.0039 },
  Haparanda:         { latitude: 65.8394, longitude: 24.1363 },
  Arvidsjaur:        { latitude: 65.5921, longitude: 19.1746 },
  Jokkmokk:          { latitude: 66.6026, longitude: 19.8302 },
};

const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>();

export async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  if (!GOOGLE_MAPS_KEY || GOOGLE_MAPS_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results[0]) {
      const loc = data.results[0].geometry.location;
      const result = { latitude: loc.lat, longitude: loc.lng };
      geocodeCache.set(address, result);
      return result;
    }
  } catch {}
  geocodeCache.set(address, null);
  return null;
}
