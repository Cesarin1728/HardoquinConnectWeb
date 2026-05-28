async function createNavbar(){
    const url = '/Frontend/Components/navbar.html';
    const navbarContainer = document.getElementById('main__navbar');

    const response = await fetch(url);
    const html = await response.text();

    navbarContainer.innerHTML = html;
    lucide.createIcons();
}

function setUpDropdownEvents(){
    const userBtn = document.querySelector('.nav__user');
    const userDropdown = document.querySelector('.nav__user_dropdown');
    const userLogOut = document.getElementById('action-log-out');
    const toggleBtn = document.querySelector('.navbar__toggle');
    const nav = document.querySelector('.navbar__nav');

    if (!userBtn || !userDropdown) return;

    const closeMobileMenu = () => {
        if (!toggleBtn || !nav) return;

        nav.classList.remove('navbar__nav--active');
        toggleBtn.classList.remove('navbar__toggle--active');
        toggleBtn.setAttribute('aria-expanded', 'false');
    };

    userBtn.addEventListener('click', (e) =>{
        e.stopPropagation();

        const shouldOpenDropdown = !userDropdown.classList.contains('nav__user_dropdown--active');
        closeMobileMenu();
        userDropdown.classList.toggle('nav__user_dropdown--active', shouldOpenDropdown);
    });

    document.addEventListener('click', (e) => {
        const clickInside = userBtn.contains(e.target) || userDropdown.contains(e.target)
        if(!clickInside){
            userDropdown.classList.remove('nav__user_dropdown--active');
        }
    });

    if(userLogOut){
        userLogOut.addEventListener('click', () => {
            sessionStorage.removeItem("user");
            userDropdown.classList.remove('nav__user_dropdown--active');
            updateNavbar(null)
        });
    }
}

function setUpTabEvents(){
    const navItems = document.querySelectorAll('.nav__link');
    navItems.forEach(navItem => {
        navItem.addEventListener('click', () => {
            const nav = document.querySelector('.navbar__nav');
            const isMobileSubmenuToggle = window.matchMedia('(max-width: 710px)').matches
                && nav?.classList.contains('navbar__nav--active')
                && navItem.closest('.nav__list_item--has-submenu');

            if (isMobileSubmenuToggle) return;

            navItems.forEach(itm => {
                itm.classList.remove('nav__link--active');
            })
            navItem.classList.add('nav__link--active');
        });
    });
}

function setUpMobileMenuEvents(){
    const toggleBtn = document.querySelector('.navbar__toggle');
    const nav = document.querySelector('.navbar__nav');
    const navLinks = document.querySelectorAll('.nav__link, .nav__submenu-link');
    const userDropdown = document.querySelector('.nav__user_dropdown');
    const submenuItems = document.querySelectorAll('.nav__list_item--has-submenu');

    if (!toggleBtn || !nav) return;

    const closeSubmenus = () => {
        submenuItems.forEach((item) => {
            item.classList.remove('nav__list_item--submenu-open');
            item.querySelector('.nav__link')?.setAttribute('aria-expanded', 'false');
        });
    };

    const setMobileMenuState = (isOpen) => {
        if (isOpen) {
            userDropdown?.classList.remove('nav__user_dropdown--active');
        } else {
            closeSubmenus();
        }

        nav.classList.toggle('navbar__nav--active', isOpen);
        toggleBtn.classList.toggle('navbar__toggle--active', isOpen);
        toggleBtn.setAttribute('aria-expanded', isOpen);
    };

    toggleBtn.addEventListener('click', () => {
        setMobileMenuState(!nav.classList.contains('navbar__nav--active'));
    })

    submenuItems.forEach((item) => {
        const parentLink = item.querySelector('.nav__link');

        parentLink?.addEventListener('click', (event) => {
            if (!window.matchMedia('(max-width: 710px)').matches || !nav.classList.contains('navbar__nav--active')) return;

            event.preventDefault();
            const shouldOpen = !item.classList.contains('nav__list_item--submenu-open');
            closeSubmenus();
            item.classList.toggle('nav__list_item--submenu-open', shouldOpen);
            parentLink.setAttribute('aria-expanded', String(shouldOpen));
        });
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            if (event.defaultPrevented) return;
            setMobileMenuState(false);
        })
    })
}

function updateNavbar(user){
    const navbar = document.querySelector('.navbar__nav');
    
    const usernameInfo = document.querySelector('.nav__user-name');
    const userPicture = document.querySelector('.nav__user_img-perfil');

    const usernameDropdown = document.querySelector('.nav__dropdown-username');
    const userPictureDropDown = document.querySelector('.nav__dropdown-img');

    if(!navbar || !usernameInfo || !userPicture || !usernameDropdown || !userPictureDropDown) return;
    
    if(user === null){
        usernameInfo.textContent = 'Username';
        usernameDropdown.textContent = 'Username';

        userPicture.src = '/Frontend/Assets/ImagenesPerfil/usuarioimg0.png';
        userPictureDropDown.src = '/Frontend/Assets/ImagenesPerfil/usuarioimg0.png';
        navbar.classList.remove('navbar__nav--authenticated');
        return
    }
    navbar.classList.add('navbar__nav--authenticated');

    usernameInfo.textContent = user.name;
    usernameDropdown.textContent = user.name;
    userPicture.src = `/Frontend/${user.img}`;
    userPictureDropDown.src = `/Frontend/${user.img}`;
}

export function activeTab(tab){
    const tabs = document.querySelectorAll('.nav__link');
    tabs.forEach(itm => {
        itm.classList.remove('nav__link--active');
        if(itm.dataset.tab === tab){
            itm.classList.add('nav__link--active');
        }
    });
}

export async function initNavbar(){
    await createNavbar();
    setUpDropdownEvents();
    setUpTabEvents();
    setUpMobileMenuEvents();
    const storedUser = sessionStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    updateNavbar(user);
}
