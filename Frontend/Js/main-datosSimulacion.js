import { initNavbar } from "./navbar.js"; 
import { activeTab } from "./navbar.js";

document.addEventListener("DOMContentLoaded", async () =>{
    await initNavbar();
    activeTab('simulaciones');
});

