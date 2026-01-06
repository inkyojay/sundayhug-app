/**
 * Blog Translations - English
 */
export default {
  // Main
  title: "Blog",
  subtitle: "Parenting tips and product guides",

  // Categories
  categories: {
    all: "All",
    sleepGuide: "Sleep Guide",
    productTips: "Product Tips",
    parenting: "Parenting Tips",
  },

  // List
  list: {
    featured: "Featured",
    recent: "Recent Posts",
    popular: "Popular Posts",
    empty: "No posts yet",
    readTime: "{{minutes}} min read",
    viewMore: "View More",
    postsCount: "{{count}} posts",
  },

  // Detail
  detail: {
    author: "Author",
    publishDate: "Published",
    readTime: "Read Time",
    share: "Share",
    linkCopied: "Link copied!",

    // Audio
    audio: {
      title: "Listen",
      playing: "Playing...",
      duration: "About {{minutes}} min",
    },

    // Related posts
    related: {
      title: "Related Posts",
    },

    // Error
    notFound: {
      title: "Post not found",
      backToList: "Back to Blog",
    },
  },

  // Search
  search: {
    placeholder: "Search...",
    noResults: "No results found",
    resultsCount: "{{count}} results",
  },

  // Tags
  tags: {
    title: "Tags",
  },

  // Errors
  errors: {
    loadFailed: "Failed to load post",
    tryAgain: "Please try again",
  },
} as const;
