import Image from 'next/image';

interface LogoIconProps {
  className?: string;
}

export default function LogoIcon({ className }: LogoIconProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Astra"
      width={160}
      height={40}
      unoptimized
      className={className}
    />
  );
}
