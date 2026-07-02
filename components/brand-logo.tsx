import Image from "next/image"

type BrandLogoProps = {
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

export default function BrandLogo({ className, width = 150, height = 42, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/trustvox-logo.svg"
      alt="TrustVox"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  )
}
