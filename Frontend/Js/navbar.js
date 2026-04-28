async function createNavbar(){
    const url = './Components/navbar.html';
    const navbarContainer = document.getElementById('main__navbar');

    const response = await fetch(url);
    const html = await response.text();

    console.log(html);
    navbarContainer.innerHTML = html;
}

function setUpDropdownEvents(){
    const userBtn = document.querySelector('.nav__user');
    const userDropdown = document.querySelector('.nav__user_dropdown');

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

export async function initNavbar(){
    await createNavbar();
    setUpDropdownEvents();
    setUpTabEvents();
}