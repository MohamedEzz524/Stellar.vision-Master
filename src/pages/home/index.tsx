import ProjectsSection from '../../components/ProjectsSection';
import ScrollTrigger3DSection from '../../components/ScrollTrigger3DSection';
import { Projects, text3D } from '../../constants';
import StarryBackground from '../../components/StarryBackground';
import HomeHeader from './HomeHeader';
import HeroSection from './HeroSection';
import HomeSticky from './HomeSticky';
import TestimonialsSection from '../../components/TestimonialsSection';

const Home = () => {
  return (
    <div className="relative overflow-hidden">
      <StarryBackground />
      <HomeSticky />
      <HeroSection />
      <HomeHeader />
      <TestimonialsSection />
      <ProjectsSection projects={Projects} sectionId="works" />
      <ScrollTrigger3DSection
        texts={text3D}
        objectAnimationStartVh={{
          row1: 50,
          row2: 120,
        }}
      />
      <div id="trigger-calendar" className="h-10"></div>
    </div>
  );
};

export default Home;
