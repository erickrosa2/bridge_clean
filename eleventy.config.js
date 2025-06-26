module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("functions");
  
  eleventyConfig.addCollection("openRequests", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/requests/*.md")
      .filter(item => item.data.status === "open")
      .sort((a, b) => new Date(b.data.expires) - new Date(a.data.expires));
  });
  
  eleventyConfig.addCollection("liveMetrics", function(collectionApi) {
    const requests = collectionApi.getFilteredByGlob("src/requests/*.md");
    const mentors = collectionApi.getFilteredByGlob("src/mentors/*.md");
    
    return {
      mentorCount: mentors.filter(m => m.data.status === "live").length,
      bridgeCount: requests.filter(r => r.data.status === "matched").length
    };
  });
  
  eleventyConfig.addFilter("maskName", function(name) {
    if (!name) return "anonymous";
    const parts = name.toLowerCase().split(" ");
    return parts.map(part => "*".repeat(part.length)).join(" ");
  });
  
  eleventyConfig.addFilter("timeLeft", function(expires) {
    const now = new Date();
    const expiry = new Date(expires);
    const hours = Math.max(0, Math.floor((expiry - now) / (1000 * 60 * 60)));
    
    if (hours < 1) return "expires soon";
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
  });
  
  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
};