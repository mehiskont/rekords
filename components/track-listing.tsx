"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DiscogsTrack, TrackVideo } from "@/types/discogs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Youtube } from "lucide-react"

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
  
  // If there are no tracks but we have videos, create synthetic tracks from videos
  const displayTracks = tracks.length > 0 ? tracks : videos.map((video, index) => ({
    position: `${index + 1}`,
    title: video.title,
    duration: video.duration,
    video: video
  }))
  
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Tracklist</h2>
        <span className="text-xs text-muted-foreground">{displayTracks.length} tracks</span>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {displayTracks.map((track, i) => (
          <AccordionItem key={`track-${i}`} value={`track-${i}`} className="border-b border-border/50">
            <AccordionTrigger className="hover:no-underline py-2 px-1">
              <div className="flex flex-row items-center text-left w-full">
                <span className="text-muted-foreground mr-2 text-sm w-6 text-center">{track.position}</span>
                <div className="flex-1 truncate">
                  <div className="font-medium text-sm truncate">{track.title}</div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {track.duration && (
                    <span className="text-xs text-muted-foreground">{track.duration}</span>
                  )}
                  {track.video && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center">
                      <Youtube className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Preview</span>
                    </span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="py-2">
              {track.video ? (
                <div className="flex flex-col">
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 self-start mb-2"
                    onClick={() => setActiveVideoUrl(track.video?.url || null)}
                  >
                    <Youtube className="h-4 w-4" />
                    {activeVideoUrl === track.video.url ? "Hide Preview" : "Play Preview"}
                  </Button>
                  
                  {activeVideoUrl === track.video.url && (
                    <div className="aspect-video w-full sm:w-3/4 md:w-1/2">
                      <iframe
                        src={getEmbedUrl(track.video.url)}
                        className="w-full h-full rounded-md"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No preview available for this track</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}