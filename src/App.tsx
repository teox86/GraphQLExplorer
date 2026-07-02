import { WizardProvider, useWizard } from './app/wizard-context';
import { AppShell } from './components/layout/AppShell';
import { StepConnection } from './components/wizard/StepConnection';
import { StepDataIntent } from './components/wizard/StepDataIntent';
import { StepRootSelection } from './components/wizard/StepRootSelection';
import { StepArguments } from './components/wizard/StepArguments';
import { StepDimensions } from './components/wizard/StepDimensions';
import { StepFields } from './components/wizard/StepFields';
import { StepPreview } from './components/wizard/StepPreview';
import { StepExecute } from './components/wizard/StepExecute';
import { StepTemplates } from './components/wizard/StepTemplates';

function WizardStepRouter() {
  const { state } = useWizard();
  switch (state.step) {
    case 1:
      return <StepConnection />;
    case 2:
      return <StepDataIntent />;
    case 3:
      return <StepRootSelection />;
    case 4:
      return <StepArguments />;
    case 5:
      return <StepDimensions />;
    case 6:
      return <StepFields />;
    case 7:
      return <StepPreview />;
    case 8:
      return <StepExecute />;
    case 9:
      return <StepTemplates />;
    default:
      return <StepConnection />;
  }
}

function App() {
  return (
    <WizardProvider>
      <AppShell>
        <WizardStepRouter />
      </AppShell>
    </WizardProvider>
  );
}

export default App;
