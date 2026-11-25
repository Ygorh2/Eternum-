import { createBrowserRouter } from "react-router";
import { Layout } from "./app/Layout";
import { 
  ConnectedOnboarding, 
  ConnectedAuth, 
  ConnectedFeed,
  ConnectedMemorialDetail,
  ConnectedCreateMemorial,
  ConnectedLivingMemory,
  ConnectedWriteTribute,
  ConnectedTheSky,
  ConnectedMyMemorials,
  ConnectedPets,
  ConnectedInvites,
  ConnectedProfile,
  ConnectedSettings,
  ConnectedPublicProfile,
  ConnectedAcceptInvite,
  ConnectedPeople,
  ProtectedRoute
} from "./app/ConnectedComponents";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: ConnectedOnboarding },
      { path: "login", Component: ConnectedAuth },
      { 
        path: "feed", 
        element: (
          <ProtectedRoute>
            <ConnectedFeed />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "memorial/:id", 
        element: (
          <ProtectedRoute>
            <ConnectedMemorialDetail />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "create-memorial", 
        element: (
          <ProtectedRoute>
            <ConnectedCreateMemorial />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "living-memory/:id", 
        element: (
          <ProtectedRoute>
            <ConnectedLivingMemory />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "write-tribute/:id", 
        element: (
          <ProtectedRoute>
            <ConnectedWriteTribute />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "the-sky", 
        element: (
          <ProtectedRoute>
            <ConnectedTheSky />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "my-memorials", 
        element: (
          <ProtectedRoute>
            <ConnectedMyMemorials />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "pets", 
        element: (
          <ProtectedRoute>
            <ConnectedPets />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "invites", 
        element: (
          <ProtectedRoute>
            <ConnectedInvites />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "profile", 
        element: (
          <ProtectedRoute>
            <ConnectedProfile />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "settings", 
        element: (
          <ProtectedRoute>
            <ConnectedSettings />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "user/:id", 
        element: (
          <ProtectedRoute>
            <ConnectedPublicProfile />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "people", 
        element: (
          <ProtectedRoute>
            <ConnectedPeople />
          </ProtectedRoute>
        ) 
      },
      // Rota pública (sem ProtectedRoute): quem recebe o convite pode nem
      // ter conta ainda — a própria tela pede login antes de aceitar.
      { path: "invite/:code", Component: ConnectedAcceptInvite },
    ],
  },
]);
