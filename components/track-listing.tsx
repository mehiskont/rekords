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
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Tracklist</h2>
      
      <Accordion type="single" collapsible className="w-full">
        {displayTracks.map((track, i) => (
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
                {track.video && (
                  <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-sm flex items-center">
                    <Youtube className="h-3 w-3 mr-1" />
                    Preview
                  </span>
                )}
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
                    Play Preview
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
                <p className="text-sm text-muted-foreground">No preview available for this track</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}