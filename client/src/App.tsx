import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import TodayPage from "@/pages/today";
import TasksPage from "@/pages/tasks";
import HabitsPage from "@/pages/habits";
import ManageDomainsPage from "@/pages/manage-domains";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TodayPage} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/habits" component={HabitsPage} />
      <Route path="/domains" component={ManageDomainsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
