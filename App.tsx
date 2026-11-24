import * as React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SoundPlayer from 'react-native-sound-player'
import DeliveryApp from './src/DeliveryApp';

const App = () => {
  React.useEffect(() => {
    if (!SoundPlayer) return
    SoundPlayer.addEventListener('FinishedPlaying', (event) => {
      console.log('FinishedPlaying', event);
    });

    SoundPlayer.addEventListener('FinishedLoading', (event) => {
      console.log('FinishedLoading', event);
    });

    SoundPlayer.addEventListener('FinishedLoadingFile', (event) => {
      console.log('FinishedLoadingFile', event);
    });

    SoundPlayer.addEventListener('FinishedLoadingURL', (event) => {
      console.log('FinishedLoadingURL', event);
    });
  }, [])

  return (
    <SafeAreaProvider>
      <DeliveryApp />
    </SafeAreaProvider>
  );
};

export default App;
