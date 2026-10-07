import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { store } from "./Storage";
import { Provider } from 'react-redux'
import ErrorBoundary from './ErrorBoundary.tsx';
createRoot(document.getElementById("root")!).render(
<ErrorBoundary>
    <Provider store={store}>
        <App />
    </Provider></ErrorBoundary>);
