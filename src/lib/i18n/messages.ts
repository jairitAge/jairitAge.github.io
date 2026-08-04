export interface LocaleMessages {
  common: {
    all: string;
    copyToClipboard: string;
  };
  navigation: {
    openMainMenu: string;
  };
  theme: {
    system: string;
    light: string;
    dark: string;
    currentTheme: string;
    cycleTheme: string;
  };
  profile: {
    email: string;
    location: string;
    workAddress: string;
    click: string;
    googleMap: string;
    send: string;
    sendEmail: string;
    researchInterests: string;
    like: string;
    liked: string;
    thanks: string;
  };
  home: {
    about: string;
    news: string;
    selectedPublications: string;
    viewAll: string;
  };
  publications: {
    searchPlaceholder: string;
    filters: string;
    year: string;
    type: string;
    noResults: string;
    abstract: string;
    bibtex: string;
    code: string;
  };
  archive: {
    searchPlaceholder: string;
    noResults: string;
    backToArchive: string;
    viewSource: string;
    noNotesYet: string;
    authors: string;
    venue: string;
    location: string;
    date: string;
    tags: string;
  };
  footer: {
    lastUpdated: string;
    builtWithPrism: string;
    visitors: string;
  };
  visitors: {
    title: string;
    description: string;
    totalVisits: string;
    uniqueVisitors: string;
    today: string;
    countries: string;
    cities: string;
    mapTitle: string;
    mapNote: string;
    topCountries: string;
    visitsFrom: string;
    citiesSuffix: string;
    unavailable: string;
    empty: string;
    recentVisitors: string;
    unknownLocation: string;
  };
}

const en: LocaleMessages = {
  common: {
    all: 'All',
    copyToClipboard: 'Copy to clipboard',
  },
  navigation: {
    openMainMenu: 'Open main menu',
  },
  theme: {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    currentTheme: 'Current theme',
    cycleTheme: 'Click to cycle theme',
  },
  profile: {
    email: 'Email',
    location: 'Location',
    workAddress: 'Work Address',
    click: 'Click',
    googleMap: 'Google Map',
    send: 'Send',
    sendEmail: 'Send Email',
    researchInterests: 'Research Interests',
    like: 'Like',
    liked: 'Liked',
    thanks: 'Thanks!',
  },
  home: {
    about: 'About',
    news: 'News',
    selectedPublications: 'Selected Publications',
    viewAll: 'View All',
  },
  publications: {
    searchPlaceholder: 'Search publications...',
    filters: 'Filters',
    year: 'Year',
    type: 'Type',
    noResults: 'No publications found matching your criteria.',
    abstract: 'Abstract',
    bibtex: 'BibTeX',
    code: 'Code',
  },
  archive: {
    searchPlaceholder: 'Search by title, author, venue, tag, or summary...',
    noResults: 'No entries match your search.',
    backToArchive: 'Back to Archive',
    viewSource: 'View source',
    noNotesYet: 'Notes coming soon.',
    authors: 'Authors',
    venue: 'Venue',
    location: 'Location',
    date: 'Date',
    tags: 'Tags',
  },
  footer: {
    lastUpdated: 'Last updated',
    builtWithPrism: 'Built with PRISM',
    visitors: 'Visitors',
  },
  visitors: {
    title: 'Visitors',
    description: 'Where the people reading this site come from.',
    totalVisits: 'Total visits',
    uniqueVisitors: 'Unique visitors',
    today: 'Today',
    countries: 'Countries',
    cities: 'Cities',
    mapTitle: 'Visitor map',
    mapNote:
      'Each dot is a city, sized by visit count. Locations are guessed from the IP address, so they point at a network rather than a person — a VPN or mobile carrier can put a visitor in the wrong city entirely.',
    topCountries: 'Top countries',
    visitsFrom: 'visits from',
    citiesSuffix: 'cities',
    unavailable: 'Visitor stats are unavailable right now.',
    empty: 'No visits recorded yet.',
    recentVisitors: 'Recent visitors',
    unknownLocation: 'Unknown location',
  },
};


export const messages: Record<string, LocaleMessages> = { en };

export function getMessages(locale: string): LocaleMessages {
  return messages[locale] || en;
}
