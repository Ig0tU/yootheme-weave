import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Globe, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { FirecrawlService } from '@/utils/firecrawl';
import { JoomlaConverter as JoomlaConverterUtil } from '@/utils/joomlaConverter';

interface ConversionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const JoomlaConverter: React.FC = () => {
  const [apiKey, setApiKey] = useState(FirecrawlService.getApiKey() || '');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [activeTab, setActiveTab] = useState('setup');

  const handleApiKeyTest = async () => {
    if (!apiKey.trim()) return;
    
    setIsTestingKey(true);
    const isValid = await FirecrawlService.testApiKey(apiKey);
    setKeyValid(isValid);
    
    if (isValid) {
      FirecrawlService.saveApiKey(apiKey);
    }
    
    setIsTestingKey(false);
  };

  const handleConversion = async () => {
    if (!url.trim() || !apiKey.trim()) return;

    setIsLoading(true);
    setConversionResult(null);

    try {
      // Scrape the website
      const scrapeResult = await FirecrawlService.scrapeWebsite(url);
      
      if (!scrapeResult.success) {
        setConversionResult({
          success: false,
          error: scrapeResult.error || 'Failed to scrape website'
        });
        return;
      }

      // Convert to YOOtheme format
      const yoothemeData = JoomlaConverterUtil.convertWebsiteToJoomla(scrapeResult.data);
      
      setConversionResult({
        success: true,
        data: yoothemeData
      });
      
      setActiveTab('result');
    } catch (error) {
      setConversionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadJson = () => {
    if (!conversionResult?.data) return;

    const blob = new Blob([JSON.stringify(conversionResult.data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yootheme-conversion.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
            Website to YOOtheme Converter
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Convert any website into a YOOtheme Page Builder compatible JSON structure for Joomla
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="convert" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Convert
            </TabsTrigger>
            <TabsTrigger value="result" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Result
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Firecrawl API Setup
                </CardTitle>
                <CardDescription>
                  Configure your Firecrawl API key to start converting websites
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Firecrawl API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="fc-..."
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setKeyValid(null);
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleApiKeyTest}
                      disabled={!apiKey.trim() || isTestingKey}
                      variant="outline"
                    >
                      {isTestingKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>
                  {keyValid === true && (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">API key is valid</span>
                    </div>
                  )}
                  {keyValid === false && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Invalid API key</span>
                    </div>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Get your free API key from{' '}
                    <a 
                      href="https://firecrawl.dev" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      firecrawl.dev
                    </a>
                    . Free tier includes 500 credits per month.
                  </AlertDescription>
                </Alert>

                {keyValid === true && (
                  <Button 
                    onClick={() => setActiveTab('convert')}
                    className="w-full"
                  >
                    Continue to Conversion
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Convert Tab */}
          <TabsContent value="convert">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Website Conversion
                </CardTitle>
                <CardDescription>
                  Enter the website URL you want to convert to YOOtheme format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleConversion}
                  disabled={!url.trim() || !apiKey.trim() || isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Converting Website...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Convert to YOOtheme
                    </>
                  )}
                </Button>

                {conversionResult && !conversionResult.success && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {conversionResult.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Result Tab */}
          <TabsContent value="result">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  Conversion Result
                </CardTitle>
                <CardDescription>
                  Your website has been converted to YOOtheme Page Builder format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversionResult?.success ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="font-medium">Conversion Successful</span>
                      </div>
                      <Badge variant="secondary">
                        {conversionResult.data?.yootheme?.builder_config?.sections?.length || 0} Sections
                      </Badge>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Joomla Version</Label>
                        <p className="text-sm text-muted-foreground">
                          {conversionResult.data?.joomla_version}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">YOOtheme Version</Label>
                        <p className="text-sm text-muted-foreground">
                          {conversionResult.data?.yootheme?.version}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Images Found</Label>
                        <p className="text-sm text-muted-foreground">
                          {conversionResult.data?.assets?.images?.length || 0} images
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Template</Label>
                        <p className="text-sm text-muted-foreground">
                          {conversionResult.data?.yootheme?.template}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Preview JSON Structure</Label>
                      <Textarea
                        value={JSON.stringify(conversionResult.data, null, 2)}
                        readOnly
                        className="h-40 font-mono text-xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={downloadJson} className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setActiveTab('convert');
                          setConversionResult(null);
                          setUrl('');
                        }}
                      >
                        Convert Another
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No conversion result available. Please convert a website first.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('convert')}
                      className="mt-4"
                    >
                      Start Conversion
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};