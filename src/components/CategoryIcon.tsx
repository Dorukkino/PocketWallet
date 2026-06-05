import {
  Baby,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  Music,
  PawPrint,
  Plane,
  Popcorn,
  ReceiptText,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Smartphone,
  Stethoscope,
  Ticket,
  Train,
  Tv,
  Utensils,
  Wrench,
  Zap,
} from 'lucide-react-native';

type Props = {
  icon: string;
  color: string;
  size?: number;
};

export function CategoryIcon({ icon, color, size = 18 }: Props) {
  const iconProps = { color, size, strokeWidth: 2.2 };

  switch (icon) {
    case 'baby':
      return <Baby {...iconProps} />;
    case 'banknote':
      return <Banknote {...iconProps} />;
    case 'zap':
      return <Zap {...iconProps} />;
    case 'gamepad':
      return <Gamepad2 {...iconProps} />;
    case 'book':
      return <BookOpen {...iconProps} />;
    case 'briefcase':
      return <BriefcaseBusiness {...iconProps} />;
    case 'utensils':
      return <Utensils {...iconProps} />;
    case 'car':
      return <Car {...iconProps} />;
    case 'shirt':
      return <Shirt {...iconProps} />;
    case 'coffee':
      return <Coffee {...iconProps} />;
    case 'credit-card':
      return <CreditCard {...iconProps} />;
    case 'dumbbell':
      return <Dumbbell {...iconProps} />;
    case 'fuel':
      return <Fuel {...iconProps} />;
    case 'gift':
      return <Gift {...iconProps} />;
    case 'graduation':
      return <GraduationCap {...iconProps} />;
    case 'health':
      return <HeartPulse {...iconProps} />;
    case 'home':
      return <Home {...iconProps} />;
    case 'laptop':
      return <Laptop {...iconProps} />;
    case 'music':
      return <Music {...iconProps} />;
    case 'paw':
      return <PawPrint {...iconProps} />;
    case 'plane':
      return <Plane {...iconProps} />;
    case 'popcorn':
      return <Popcorn {...iconProps} />;
    case 'receipt':
      return <ReceiptText {...iconProps} />;
    case 'scissors':
      return <Scissors {...iconProps} />;
    case 'shield':
      return <ShieldCheck {...iconProps} />;
    case 'shopping-bag':
      return <ShoppingBag {...iconProps} />;
    case 'shopping-cart':
      return <ShoppingCart {...iconProps} />;
    case 'smartphone':
      return <Smartphone {...iconProps} />;
    case 'stethoscope':
      return <Stethoscope {...iconProps} />;
    case 'ticket':
      return <Ticket {...iconProps} />;
    case 'train':
      return <Train {...iconProps} />;
    case 'tv':
      return <Tv {...iconProps} />;
    case 'wrench':
      return <Wrench {...iconProps} />;
    default:
      return <BriefcaseBusiness {...iconProps} />;
  }
}
