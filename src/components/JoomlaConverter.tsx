import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Globe, Download, Code, Zap, Clock, AlertTriangle } from "lucide-react";
import { FirecrawlService } from '@/utils/firecrawl';
import { JoomlaConverter as Converter } from '@/utils/joomlaConverter';

export const JoomlaConverter = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversionResult, setConversionResult] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(!FirecrawlService.getApiKey());
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isRateLimited: boolean;
    retryAfter: number;
    resetTime?: Date;
  }>({ isRateLimited: false, retryAfter: 0 });
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for rate limit
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setRateLimitInfo({ isRateLimited: false, retryAfter: 0 });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const parseRateLimitError = (errorMessage: string) => {
    const retryMatch = errorMessage.match(/retry after (\d+)s/);
    const resetMatch = errorMessage.match(/resets at (.+)/);
    
    if (retryMatch) {
      const retryAfter = parseInt(retryMatch[1]);
      const resetTime = resetMatch ? new Date(resetMatch[1]) : undefined;
      
      setRateLimitInfo({
        isRateLimited: true,
        retryAfter,
        resetTime
      });
      setCountdown(retryAfter);
      return true;
    }
    return false;
  };

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Firecrawl API key",
        variant: "destructive",
      });
      return;
    }

    const isValid = await FirecrawlService.testApiKey(apiKey);
    if (isValid) {
      FirecrawlService.saveApiKey(apiKey);
      setShowApiKey(false);
      toast({
        title: "Success",
        description: "API key saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Invalid API key. Please check and try again.",
        variant: "destructive",
      });
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUrl(url)) {
      toast({
        title: "⚠️ Invalid Input",
        description: "Please provide a valid URL (http/https)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setConversionResult(null);
    
    try {
      const scrapeResult = await FirecrawlService.scrapeWebsite(url);
      
      if (!scrapeResult.success) {
        // Check if it's a rate limit error
        if (scrapeResult.error?.includes('Rate limit exceeded')) {
          const isRateLimitParsed = parseRateLimitError(scrapeResult.error);
          if (isRateLimitParsed) {
            toast({
              title: "🚦 Rate Limit Reached",
              description: `Free tier limit reached. Wait ${rateLimitInfo.retryAfter}s or upgrade your plan.`,
              variant: "destructive",
            });
            return;
          }
        }
        
        toast({
          title: "Scraping Failed",
          description: scrapeResult.error || "Failed to scrape website",
          variant: "destructive",
        });
        return;
      }

      const joomlaConfig = Converter.convertWebsiteToJoomla(scrapeResult.data);
      setConversionResult(joomlaConfig);
      
      toast({
        title: "🎉 Conversion Complete",
        description: "Website successfully converted to Joomla/YOOtheme format",
      });
    } catch (error: any) {
      console.error('Conversion error:', error);
      
      // Handle rate limit errors from the catch block
      if (error.message?.includes('Rate limit exceeded')) {
        parseRateLimitError(error.message);
        toast({
          title: "🚦 Rate Limit Reached",
          description: "Free tier limit reached. Please wait or upgrade your plan.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conversion Failed",
          description: "An error occurred during conversion",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const downloadJson = () => {
    if (!conversionResult) return;
    
    const blob = new Blob([JSON.stringify(conversionResult, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `joomla-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-hero p-4 rounded-2xl shadow-glow">
              <Zap className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
            JOOMLA CONVERTER BOT
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered website to Joomla 4+ YOOtheme Page Builder JSON converter
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Badge variant="secondary" className="px-4 py-2">
              <Globe className="h-4 w-4 mr-2" />
              Joomla 4.3+
            </Badge>
            <Badge variant="secondary" className="px-4 py-2">
              <Code className="h-4 w-4 mr-2" />
              YOOtheme Pro 3.2+
            </Badge>
          </div>
        </div>

        {/* API Key Setup */}
        {showApiKey && (
          <Card className="max-w-md mx-auto mb-8 shadow-card">
            <CardHeader>
              <CardTitle className="text-center">Setup Required</CardTitle>
              <CardDescription className="text-center">
                Enter your Firecrawl API key to start converting websites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Your Firecrawl API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="transition-smooth"
              />
              <Button 
                onClick={handleApiKeySubmit}
                className="w-full bg-gradient-primary hover:shadow-elegant transition-smooth"
              >
                Save API Key
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Get your API key from{' '}
                <a href="https://www.firecrawl.dev" target="_blank" rel="noopener noreferrer" 
                   className="text-primary hover:underline">
                  firecrawl.dev
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Rate Limit Warning */}
        {rateLimitInfo.isRateLimited && (
          <Alert className="max-w-4xl mx-auto mb-6 border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-destructive">Rate Limit Exceeded</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>You've reached Firecrawl's free tier limit (3 requests/minute).</p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Retry available in: <strong>{countdown}s</strong></span>
                </div>
                <p className="text-sm">
                  <a 
                    href="https://firecrawl.dev/pricing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    Upgrade your plan
                  </a> for higher limits or wait for the reset.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Converter */}
        {!showApiKey && (
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-card mb-8">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Website URL Converter</CardTitle>
                <CardDescription className="text-center">
                  Enter a website URL to convert it to Joomla/YOOtheme Page Builder configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConvert} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="url" className="text-sm font-medium">
                      Target Website URL
                    </label>
                    <Input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      required
                      className="transition-smooth focus:shadow-glow"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={isLoading || rateLimitInfo.isRateLimited}
                    className="w-full bg-gradient-primary hover:shadow-elegant transition-smooth disabled:opacity-50"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Converting Website...
                      </>
                    ) : rateLimitInfo.isRateLimited ? (
                      <>
                        <Clock className="mr-2 h-5 w-5" />
                        Retry in {countdown}s
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        Convert to Joomla
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            {conversionResult && (
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-success">Conversion Complete!</CardTitle>
                    <CardDescription>
                      Your Joomla/YOOtheme Page Builder configuration is ready
                    </CardDescription>
                  </div>
                  <Button
                    onClick={downloadJson}
                    variant="secondary"
                    className="bg-gradient-secondary hover:shadow-elegant transition-smooth"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download JSON
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4 flex-wrap">
                      <Badge variant="outline">
                        Joomla {conversionResult.joomla_version}
                      </Badge>
                      <Badge variant="outline">
                        {conversionResult.yootheme.template}
                      </Badge>
                      <Badge variant="outline">
                        {conversionResult.yootheme.builder_config.sections.length} Sections
                      </Badge>
                      <Badge variant="outline">
                        {conversionResult.assets.images.length} Images
                      </Badge>
                    </div>
                    
                    <Textarea
                      value={JSON.stringify(conversionResult, null, 2)}
                      readOnly
                      className="min-h-[400px] font-mono text-sm bg-muted"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};