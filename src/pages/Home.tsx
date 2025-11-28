import Hero from '../components/Hero';
import PositioningStatement from '../components/PositioningStatement';
import CoreServiceGrid from '../components/CoreServiceGrid';
import ValueProposition from '../components/ValueProposition';
import UseCaseStrips from '../components/UseCaseStrips';
import ProcessOverview from '../components/ProcessOverview';
import Industries from '../components/Industries';
import FinalCTA from '../components/FinalCTA';

export default function Home() {
  return (
    <>
      <Hero />
      <PositioningStatement />
      <CoreServiceGrid />
      <ValueProposition />
      <UseCaseStrips />
      <ProcessOverview />
      <Industries />
      <FinalCTA />
    </>
  );
}
