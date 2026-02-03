export const texts = [
  'brand identity',
  'Motion',
  'Websites',
  'Products',
  'UI/UX design',
];
export const autoRotateTexts = [
  'ONLY 2 SPOTS AVAILABLE THIS MONTH',
  'STAND OUT IN YOUR MARKET',
];
export const text3D = [
  'Marketing before design Strategy before visuals Conversion before aesthetics Results before opinions',
  'We study your audience We map user behavior We define clear actions We remove friction',
  'Every section has a goal Every headline has a purpose Every click leads somewhere Nothing is random ',
  'Fast loading websites Clean scalable code SEO-ready structure Built to grow',
  'Designed for campaigns Optimized for ads Ready for funnels Made to convert',
  'Launch is not the end We test and refine We optimize performance We improve conversions',
  'If results matter If growth is the goal If performance comes first Stellar Vision is the choice',
];

export const homeHeaderParagraphs = {
  first: 'We’re marketers first — designers second.',
  second:
    'Our websites don’t just impress. They perform. We focus on behavior, psychology, funnels, and conversion paths — then we design around them.',
};

export const heroSectionParagraph =
  'We design and build high-performance websites for brands that want more leads, more sales, and real growth. Marketing comes first. Design follows strategy. Results are the goal.';
export interface Project {
  id: string;
  title: string;
  year: string;
  tags: string;
  image: string;
  imageAlt: string;
  href: string;
  video?: string;
}

// Import project images
import cozyFragrancesImg from '../assets/projects/Cozy Fragrances.webp';
import crownImg from '../assets/projects/Crown.webp';
import flexieveImg from '../assets/projects/Flexieve.webp';
import fo7osatImg from '../assets/projects/Fo7osat.webp';
import furnitureImg from '../assets/projects/Furniture.webp';
import gogaToysImg from '../assets/projects/Goga Toys.webp';
import laundorImg from '../assets/projects/Laundor.webp';
import mahlaImg from '../assets/projects/Mahla.webp';
import maroofImg from '../assets/projects/Maroof.webp';
import nafasImg from '../assets/projects/Nafas.webp';
import performanceImg from '../assets/projects/Performance.webp';
import smileImg from '../assets/projects/Smile.webp';
import steelixeImg from '../assets/projects/Steelixe.webp';
import twoImg from '../assets/projects/Two.webp';
import ultramanImg from '../assets/projects/Ultraman.webp';

export const Projects: Project[] = [
  {
    id: 'project-1',
    title: 'Two Fashion',
    year: '2025',
    tags: 'Ecommerce Website',
    image: twoImg,
    imageAlt: 'Two Fashion ecommerce website',
    href: 'https://two.stelllar.vision',
  },
  {
    id: 'project-2',
    title: 'Laundor',
    year: '2025',
    tags: 'Ecommerce Website',
    image: laundorImg,
    imageAlt: 'Laundor ecommerce website',
    href: 'https://laundor.stelllar.vision',
  },
  {
    id: 'project-3',
    title: 'Crown Natural Care',
    year: '2025',
    tags: 'Ecommerce Website',
    image: crownImg,
    imageAlt: 'Crown Natural Care ecommerce website',
    href: 'https://crownnaturalcare.stelllar.vision',
  },

  {
    id: 'project-6',
    title: 'Goga Toys',
    year: '2025',
    tags: 'Ecommerce Website & Visual Identity',
    image: gogaToysImg,
    imageAlt: 'Goga Toys ecommerce website and visual identity',
    href: 'https://gogatoys.stelllar.vision',
  },
  {
    id: 'project-13',
    title: 'Steelixe',
    year: '2025',
    tags: ' Ecommerce Website, 3D Modeling',
    image: steelixeImg,
    imageAlt: 'Steelixe ecommerce website with 3D modeling',
    href: 'https://steelixe.com',
  },
  {
    id: 'project-11',
    title: 'Performance Marketing LP',
    year: '2025',
    tags: 'Digital Product Website',
    image: performanceImg,
    imageAlt: 'Performance Marketing LP digital product website',
    href: 'https://performancemarketerlp.stelllar.vision',
  },

  {
    id: 'project-5',
    title: 'Greennest Furniture',
    year: '2025',
    tags: 'Ecommerce Website',
    image: furnitureImg,
    imageAlt: 'Ultraman Trimmer website',
    href: 'https://greennest.stelllar.vision',
  },

  {
    id: 'project-15',
    title: 'Ultraman Trimmer',
    year: '2025',
    tags: 'Website Development',
    image: ultramanImg,
    imageAlt: 'Ultraman Trimmer website',
    href: 'https://ultraman.stelllar.vision',
  },
  {
    id: 'project-12',
    title: 'Smilemakers Clinics',
    year: '2025',
    tags: 'Lead Generation Website & Visual Identity',
    image: smileImg,
    imageAlt: 'Smilemakers Clinics lead generation website',
    href: 'https://smilywhite.stelllar.vision',
  },
  {
    id: 'project-9',
    title: 'Maroof Optics',
    year: '2025',
    tags: 'Ecommerce Website',
    image: maroofImg,
    imageAlt: 'Maroof Optics ecommerce website',
    href: 'https://maroofoptics.stelllar.vision',
  },
  {
    id: 'project-4',
    title: 'Fohosat Lab',
    year: '2024',
    tags: 'Lead Generation Website',
    image: fo7osatImg,
    imageAlt: 'Fohosat Lab lead generation website',
    href: 'https://fohosatlab.stelllar.vision',
  },
  {
    id: 'project-10',
    title: 'Nafas Nasal Tape',
    year: '2025',
    tags: 'Website Development',
    image: nafasImg,
    imageAlt: 'Nafas Nasal Tape website',
    href: 'https://nafas.stelllar.vision',
  },
  {
    id: 'project-7',
    title: 'Cozy Fragrances',
    year: '2025',
    tags: 'Ecommerce Website',
    image: cozyFragrancesImg,
    imageAlt: 'Cozy Fragrances ecommerce website',
    href: 'https://cozyfragrance.stelllar.vision',
  },
  {
    id: 'project-8',
    title: 'Mahla Cosmetics',
    year: '2025',
    tags: 'Ecommerce Website',
    image: mahlaImg,
    imageAlt: 'Mahla Cosmetics ecommerce website',
    href: 'https://mahlacosmetics.stelllar.vision',
  },
  {
    id: 'project-14',
    title: 'Flexieve Shapers',
    year: '2025',
    tags: 'Ecommerce Website',
    image: flexieveImg,
    imageAlt: 'Flexieve Shapers ecommerce website',
    href: 'https://flexieve.stelllar.vision',
  },
];

export interface TestimonialVideo {
  id: string;
  video: string;
}

export const TestimonialVideos: TestimonialVideo[] = [
  {
    id: 'testimonial-3',
    video:
      'https://res.cloudinary.com/deqfby6bi/video/upload/v1768511514/Sigma_Testimonial_1_k8uipf.mp4',
  },
  {
    id: 'testimonial-2',
    video:
      'https://res.cloudinary.com/deqfby6bi/video/upload/v1768511505/Helal_Testimonial_1_vbqjna.mp4',
  },
  {
    id: 'testimonial-1',
    video:
      'https://res.cloudinary.com/deqfby6bi/video/upload/v1768511508/Meana_Testimonial_1_dtsxch.mp4',
  },
  {
    id: 'testimonial-4',
    video:
      'https://res.cloudinary.com/deqfby6bi/video/upload/v1768511523/nafas_testimonial_1_hsgych.mp4',
  },
];
