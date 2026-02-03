import { useMediaQuery } from 'react-responsive';
import ProjectsSectionMobile from './ProjectsSectionMobile';
import ProjectsSectionDesktop from './ProjectsSectionDesktop';

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

interface ProjectsSectionProps {
  projects: Project[];
  sectionId?: string;
}

// Main ProjectsSection Component - Conditionally renders mobile or desktop
const ProjectsSection = ({
  projects,
  sectionId = 'works',
}: ProjectsSectionProps) => {
  // Use react-responsive for cleaner media query handling
  // Matches Tailwind's lg breakpoint (1024px)
  const isMobile = useMediaQuery({ maxWidth: 1023 });

  // Conditionally render mobile or desktop version
  if (isMobile) {
    return <ProjectsSectionMobile projects={projects} sectionId={sectionId} />;
  }

  return <ProjectsSectionDesktop projects={projects} sectionId={sectionId} />;
};

export default ProjectsSection;
