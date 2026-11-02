/**
 * BusinessWorker Engine
 * Specialized engine for modeling business attributes, behavior, and discovery.
 */
export class BusinessWorker {
  constructor(shopData) {
    this.shop = shopData;
    this.attributes = {
      industry: shopData.industry_type || 'retail',
      usp: [], // Unique Selling Propositions
      mission: '',
      brandTone: 'professional', // professional, friendly, luxury, quirky
      targetAudience: [],
      location: shopData.address || '',
      keywords: []
    };
  }

  /**
   * Models the business characteristics
   */
  setModel(metadata) {
    this.attributes = { ...this.attributes, ...metadata };
  }

  /**
   * Discovery Logic: "Where can I get this?"
   * Simulates a search matching engine based on business modeling.
   */
  matchesQuery(query) {
    const q = query.toLowerCase();
    const keywords = [
      this.shop.name.toLowerCase(),
      this.attributes.industry.toLowerCase(),
      ...this.attributes.usp.map(u => u.toLowerCase()),
      ...this.attributes.keywords.map(k => k.toLowerCase())
    ];

    // Check if query contains "where can i get" or "looking for"
    const intentMatched = q.includes('where') || q.includes('get') || q.includes('looking for') || q.includes('buy');
    
    // Check if any keywords match the query
    const keywordMatched = keywords.some(k => q.includes(k));

    if (intentMatched && keywordMatched) {
      return {
        matched: true,
        message: `You can get this at ${this.shop.name}! ${this.shop.tagline || ''}`,
        link: `https://${this.shop.subdomain}.tmsavannah.com`
      };
    }

    return { matched: false };
  }

  /**
   * SEO Metadata Generation
   */
  getSEOMetadata() {
    const title = `${this.shop.name} | ${this.attributes.industry} | ${this.shop.tagline || ''}`;
    const description = `${this.shop.name} offers the best ${this.attributes.industry} services. ${this.attributes.mission || this.shop.tagline || ''}. Located in ${this.attributes.location}.`;
    
    return {
      title,
      description,
      keywords: this.attributes.keywords.join(', '),
      ogTitle: title,
      ogDescription: description,
      ogImage: this.shop.logo_url
    };
  }
}

export default BusinessWorker;
