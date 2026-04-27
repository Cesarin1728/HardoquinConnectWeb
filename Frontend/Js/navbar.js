export function initNavbar(){
    const userBtn = document.querySelector('.nav__list_item--user-info');
    const userDropdown = document.querySelector('.nav__user_dropdown');

    userBtn.addEventListener('click', () =>{
        userDropdown.classList.toggle('nav__user_dropdown--active');
    })
}