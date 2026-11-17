import { createContext, useContext } from 'react'
import { compressImage, type ImageCompressor } from './image'

/** The image compressor; tests swap in a fake because jsdom cannot decode images. */
export const ImageCompressorContext = createContext<ImageCompressor>(compressImage)

export const useImageCompressor = () => useContext(ImageCompressorContext)
