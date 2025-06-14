import { Car } from 'lucide-react';

interface LogoProps {
  className?: string;
  showSlogan?: boolean;
}

const Logo = ({ className = "h-8 w-8", showSlogan = false }: LogoProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-full bg-white flex items-center justify-center ${className}`}>
        <img src="/src/assets/soltani center png.png" alt="Soltani Center" className="w-full h-full p-1" />
      </div>
      {showSlogan && (
        <div className="text-center mt-2">
          <p className="text-sm font-semibold">برترین‌ها برای بهترین‌ها</p>
          <p className="text-xs text-gray-500">Finest for the best</p>
        </div>
      )}
    </div>
  );
};

export default Logo;