export interface IndiaDestinationOption {
  id: string;
  city: string;
  region: string;
  country: "India";
  highlights: string[];
}

export const indiaDestinations: IndiaDestinationOption[] = [
  { id: "jaipur-rajasthan", city: "Jaipur", region: "Rajasthan", country: "India", highlights: ["forts", "heritage stays", "food"] },
  { id: "udaipur-rajasthan", city: "Udaipur", region: "Rajasthan", country: "India", highlights: ["lakes", "palaces", "romance"] },
  { id: "jodhpur-rajasthan", city: "Jodhpur", region: "Rajasthan", country: "India", highlights: ["blue city", "forts", "cafes"] },
  { id: "new-delhi-delhi", city: "New Delhi", region: "Delhi", country: "India", highlights: ["culture", "food", "history"] },
  { id: "mumbai-maharashtra", city: "Mumbai", region: "Maharashtra", country: "India", highlights: ["coast", "nightlife", "design"] },
  { id: "goa-north-goa", city: "North Goa", region: "Goa", country: "India", highlights: ["beaches", "nightlife", "cafes"] },
  { id: "goa-south-goa", city: "South Goa", region: "Goa", country: "India", highlights: ["beaches", "quiet stays", "slow travel"] },
  { id: "kochi-kerala", city: "Kochi", region: "Kerala", country: "India", highlights: ["harbour", "art", "food"] },
  { id: "munnar-kerala", city: "Munnar", region: "Kerala", country: "India", highlights: ["tea estates", "hills", "slow travel"] },
  { id: "alleppey-kerala", city: "Alleppey", region: "Kerala", country: "India", highlights: ["backwaters", "houseboats", "relaxed pace"] },
  { id: "mysuru-karnataka", city: "Mysuru", region: "Karnataka", country: "India", highlights: ["palace", "culture", "markets"] },
  { id: "coorg-karnataka", city: "Coorg", region: "Karnataka", country: "India", highlights: ["coffee estates", "nature", "premium stays"] },
  { id: "bengaluru-karnataka", city: "Bengaluru", region: "Karnataka", country: "India", highlights: ["food", "design", "city break"] },
  { id: "hyderabad-telangana", city: "Hyderabad", region: "Telangana", country: "India", highlights: ["food", "heritage", "city break"] },
  { id: "varanasi-uttar-pradesh", city: "Varanasi", region: "Uttar Pradesh", country: "India", highlights: ["ghats", "culture", "sunrise"] },
  { id: "rishikesh-uttarakhand", city: "Rishikesh", region: "Uttarakhand", country: "India", highlights: ["wellness", "river", "mountains"] },
  { id: "shimla-himachal-pradesh", city: "Shimla", region: "Himachal Pradesh", country: "India", highlights: ["hills", "heritage", "cool weather"] },
  { id: "manali-himachal-pradesh", city: "Manali", region: "Himachal Pradesh", country: "India", highlights: ["mountains", "adventure", "scenery"] },
  { id: "darjeeling-west-bengal", city: "Darjeeling", region: "West Bengal", country: "India", highlights: ["tea", "views", "slow travel"] },
  { id: "gangtok-sikkim", city: "Gangtok", region: "Sikkim", country: "India", highlights: ["mountains", "cafes", "scenery"] },
];

export function searchIndiaDestinations(query: string): IndiaDestinationOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return indiaDestinations;
  }

  return indiaDestinations.filter((destination) => {
    const haystack = [
      destination.city,
      destination.region,
      destination.country,
      ...destination.highlights,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
