async function createNavbar(){
    const url = './Components/navbar.html';
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

    if (!userBtn || !userDropdown) return;

    userBtn.addEventListener('click', (e) =>{
        e.stopPropagation();
        userDropdown.classList.toggle('nav__user_dropdown--active');
    })

    document.addEventListener('click', (e) => {
        const clickInside = userBtn.contains(e.target) || userDropdown.contains(e.target)
        if(!clickInside){
            userDropdown.classList.remove('nav__user_dropdown--active');
        }
    })
    if(userLogOut){
        userLogOut.addEventListener('click', () => {
            sessionStorage.removeItem("user");
            userDropdown.classList.remove('nav__user_dropdown--active');
            updateNavbar(null)
        })
    }
}

function setUpTabEvents(){
    const navItems = document.querySelectorAll('.nav__list_item:not(.nav__list_item--user-info)');
    navItems.forEach(navItem => {
        navItem.addEventListener('click', () => {
            navItems.forEach(itm => {
                itm.classList.remove('nav__list_item--active');
            })
            navItem.classList.add('nav__list_item--active');
        })
    })
}
function setUpMobileMenuEvents(){
    const toggleBtn = document.querySelector('.navbar__toggle');
    const nav = document.querySelector('.navbar__nav');
    const navLinks = document.querySelectorAll('.nav__link');

    if (!toggleBtn || !nav) return;

    toggleBtn.addEventListener('click', () => {
        nav.classList.toggle('navbar__nav--active');
        toggleBtn.classList.toggle('navbar__toggle--active');
    })

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('navbar__nav--active');
            toggleBtn.classList.remove('navbar__toggle--active');
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

        userPicture.src = './Assets/ImagenesPerfil/usuarioimg0.png';
        userPictureDropDown.src = './Assets/ImagenesPerfil/usuarioimg0.png';
        navbar.classList.remove('navbar__nav--authenticated');
        return
    }
    navbar.classList.add('navbar__nav--authenticated');

    usernameInfo.textContent = user.name;
    usernameDropdown.textContent = user.name;
    userPicture.src = `./${user.img}`;
    userPictureDropDown.src = `./${user.img}`;
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