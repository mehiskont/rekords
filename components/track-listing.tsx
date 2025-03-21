"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DiscogsTrack, TrackVideo } from "@/types/discogs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ExternalLink, Music, Youtube } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TrackListingProps {
  tracks: DiscogsTrack[]
  videos: TrackVideo[]
}

export function TrackListing({ tracks, videos }: TrackListingProps) {
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)
  
  // If no tracks or videos, don't render anything
  if ((!tracks || tracks.length === 0) && (!videos || videos.length === 0)) {
    return null
  }
  
  // Transform YouTube URLs to embed URLs
  const getEmbedUrl = (url: string) => {
    // Handle youtu.be format
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    
    // Handle youtube.com format
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v')
      return `https://www.youtube.com/embed/${videoId}`
    }
    
    // Return original URL if it doesn't match known formats
    return url
  }
  
  // Count how many tracks have videos
  const tracksWithVideoCount = tracks.filter(track => track.video).length
  
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Listen</h2>
      
      <Tabs defaultValue={tracksWithVideoCount > 0 ? "tracklist" : (videos.length > 0 ? "videos" : "tracklist")}>
        <TabsList className="mb-4">
          {tracks && tracks.length > 0 && (
            <TabsTrigger value="tracklist" className="flex items-center gap-1">
              <Music className="h-4 w-4" />
              Tracklist
            </TabsTrigger>
          )}
          {videos && videos.length > 0 && (
            <TabsTrigger value="videos" className="flex items-center gap-1">
              <Youtube className="h-4 w-4" />
              Videos
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* Tracklist tab */}
        {tracks && tracks.length > 0 && (
          <TabsContent value="tracklist">
            <Accordion type="single" collapsible className="w-full">
              {tracks.map((track, i) => (
                <AccordionItem key={`track-${i}`} value={`track-${i}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-row items-start text-left">
                      <span className="text-muted-foreground mr-2">{track.position}</span>
                      <div>
                        <div className="font-medium">{track.title}</div>
                        {track.duration && (
                          <div className="text-sm text-muted-foreground">{track.duration}</div>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {track.video ? (
                      <div className="pt-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => setActiveVideoUrl(track.video?.url || null)}
                        >
                          <Youtube className="h-4 w-4" />
                          Watch on YouTube
                        </Button>
                        
                        {activeVideoUrl === track.video.url && (
                          <div className="mt-4 aspect-video w-full">
                            <iframe
                              src={getEmbedUrl(track.video.url)}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No video available for this track</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        )}
        
        {/* Videos tab */}
        {videos && videos.length > 0 && (
          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video, i) => (
                <div key={`video-${i}`} className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">{video.title}</h3>
                  {video.duration && (
                    <p className="text-sm text-muted-foreground mb-2">{video.duration}</p>
                  )}
                  <div className="flex flex-row gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => setActiveVideoUrl(video.url)}
                    >
                      <Youtube className="h-4 w-4" />
                      Watch
                    </Button>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      asChild
                    >
                      <a href={video.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                    </Button>
                  </div>
                  
                  {activeVideoUrl === video.url && (
                    <div className="mt-4 aspect-video w-full">
                      <iframe
                        src={getEmbedUrl(video.url)}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}