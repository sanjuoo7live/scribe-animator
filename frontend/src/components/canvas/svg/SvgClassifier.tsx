// SVG Classifier determines whether to use Konva rendering or Vivus overlay
export class SvgClassifier {
  private cache: Map<string, 'konva' | 'vivus'> = new Map();

  // Classify SVG based on content hash
  classify(svgContent: string): 'konva' | 'vivus' {
    const hash = this.hashString(svgContent);
    const cached = this.cache.get(hash);
    if (cached) return cached;

    // Simple heuristic: if it has complex features, use Vivus
    const hasGradients = /<linearGradient|<radialGradient|<pattern/i.test(svgContent);
    const hasMasks = /<mask/i.test(svgContent);
    const hasFilters = /<filter/i.test(svgContent);
    const hasComplexPaths = /<path[^>]*d="[^"]*"/gi.test(svgContent) &&
                           (svgContent.match(/<path/gi) || []).length > 5;

    const useVivus = hasGradients || hasMasks || hasFilters || hasComplexPaths;

    const result = useVivus ? 'vivus' : 'konva';
    this.cache.set(hash, result);
    return result;
  }

  // Simple string hash function
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Global classifier instance
export const svgClassifier = new SvgClassifier();
