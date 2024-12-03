import React from "react";
import {
  AboutSection,
  ArticlesSection,
  ContactSection,
  HeroSection,
  InterestsSection,
  Page,
  ProjectsSection,
  Seo,
} from "gatsby-theme-portfolio-minimal";
import "./styles.css";

export default function IndexPage() {
  return (
    <>
      <Seo title="William Heller" />
      <Page useSplashScreenAnimation>
        <HeroSection sectionId="hero" />
        <AboutSection sectionId="about" heading="About" />
        <InterestsSection sectionId="skills" heading="Skills" />
        <ArticlesSection sectionId="articles" heading="Latest Articles" sources={['Blog']} />
        {/* <ProjectsSection sectionId="highlights" heading="Highlights" /> */}
        <ContactSection sectionId="github" heading="Issues?" />
      </Page>
    </>
  );
}
