export interface ChildMainMenuListVM {
    icon: string;
    label: string;
    path: string;
  }
  
  export interface MainMenuListVM {
    icon: string;
    label: string;
    path: string;
    childMainMenuListVMs?: ChildMainMenuListVM[];
  }
  