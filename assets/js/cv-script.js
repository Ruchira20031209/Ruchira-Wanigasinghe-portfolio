//=============== CUSTOM CURSOR ===============
const cursor = document.querySelector('.cursor');
let mouseX = 0, mouseY = 0;

const cursorMove = () => {
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
    cursor.style.transform = 'translate(-50%, -50%)';
    requestAnimationFrame(cursorMove);
};

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Hide cursor on mobile devices
if (window.matchMedia("(pointer: coarse)").matches) {
    cursor.style.display = 'none';
} else {
    cursorMove();
}

// Hide cursor when hovering over links and buttons
const interactiveElements = document.querySelectorAll('a, button, .social-link, .action-btn, .skill-item, .project-card');

interactiveElements.forEach(element => {
    element.addEventListener('mouseover', () => {
        cursor.classList.add('hide-cursor');
    });
    
    element.addEventListener('mouseleave', () => {
        cursor.classList.remove('hide-cursor');
    });
});

// Add hide-cursor class to CSS
const style = document.createElement('style');
style.textContent = `
    .hide-cursor {
        width: 0;
        height: 0;
    }
`;
document.head.appendChild(style);

//=============== PRINT FUNCTIONALITY ===============
const printBtn = document.getElementById('print-btn');
if (printBtn) {
    printBtn.addEventListener('click', () => {
        window.print();
    });
}

//=============== DOWNLOAD PDF FUNCTIONALITY ===============
const downloadBtn = document.getElementById('download-btn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        // Path to your CV PDF file
        const pdfPath = 'assets/pdf/Ruchira-Cv.pdf';
        const fileName = 'Ruchira_Wanigasinghe_CV.pdf';
        
        // Create a temporary anchor element for download
        const link = document.createElement('a');
        link.href = pdfPath;
        link.download = fileName; // Set the download filename
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="ri-check-line"></i> Download Started';
        downloadBtn.style.backgroundColor = 'var(--first-color)';
        downloadBtn.style.color = 'var(--body-color)';
        
        setTimeout(() => {
            downloadBtn.innerHTML = originalHTML;
            downloadBtn.style.backgroundColor = '';
            downloadBtn.style.color = '';
        }, 2000);
    });
}

//=============== COPY EMAIL ===============
const copyEmailBtn = document.getElementById('copy-email');
if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
        const email = 'ruchirawanigasingha@gmail.com';
        
        navigator.clipboard.writeText(email).then(() => {
            const originalHTML = copyEmailBtn.innerHTML;
            copyEmailBtn.innerHTML = '<i class="ri-check-line"></i> Email Copied';
            copyEmailBtn.style.backgroundColor = 'var(--first-color)';
            copyEmailBtn.style.color = 'var(--body-color)';
            
            setTimeout(() => {
                copyEmailBtn.innerHTML = originalHTML;
                copyEmailBtn.style.backgroundColor = '';
                copyEmailBtn.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy email: ', err);
            alert('Failed to copy email. Please copy manually: ' + email);
        });
    });
}

//=============== SET CURRENT YEAR ===============
const currentYearElement = document.getElementById('current-year');
if (currentYearElement) {
    const currentYear = new Date().getFullYear();
    currentYearElement.textContent = currentYear;
}

//=============== ADD ANIMATION TO SECTIONS ON SCROLL ===============
const sections = document.querySelectorAll('.cv-section');

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

sections.forEach(section => {
    sectionObserver.observe(section);
});

// Add animation classes to CSS
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    .cv-section {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
    }
    
    .cv-section.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Staggered animation for children */
    .education-item,
    .work-item,
    .project-card,
    .skills-category {
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .cv-section.animate-in .education-item,
    .cv-section.animate-in .work-item,
    .cv-section.animate-in .project-card,
    .cv-section.animate-in .skills-category {
        opacity: 1;
        transform: translateY(0);
    }
    
    /* Delay each item */
    .cv-section.animate-in .education-item:nth-child(1),
    .cv-section.animate-in .work-item:nth-child(1),
    .cv-section.animate-in .project-card:nth-child(1),
    .cv-section.animate-in .skills-category:nth-child(1) {
        transition-delay: 0.1s;
    }
    
    .cv-section.animate-in .education-item:nth-child(2),
    .cv-section.animate-in .work-item:nth-child(2),
    .cv-section.animate-in .project-card:nth-child(2),
    .cv-section.animate-in .skills-category:nth-child(2) {
        transition-delay: 0.2s;
    }
    
    .cv-section.animate-in .education-item:nth-child(3),
    .cv-section.animate-in .work-item:nth-child(3),
    .cv-section.animate-in .project-card:nth-child(3),
    .cv-section.animate-in .skills-category:nth-child(3) {
        transition-delay: 0.3s;
    }
`;
document.head.appendChild(animationStyle);

//=============== HOVER EFFECTS FOR PROJECT CARDS ===============
const projectCards = document.querySelectorAll('.project-card');
projectCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        const number = card.querySelector('.project-number');
        if (number) {
            number.style.opacity = '0.5';
            number.style.transform = 'scale(1.1)';
            number.style.transition = 'all 0.3s ease';
        }
    });
    
    card.addEventListener('mouseleave', () => {
        const number = card.querySelector('.project-number');
        if (number) {
            number.style.opacity = '0.2';
            number.style.transform = 'scale(1)';
        }
    });
});

//=============== SKILL ITEMS HOVER EFFECT ===============
const skillItems = document.querySelectorAll('.skill-item');
skillItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.boxShadow = '0 5px 15px var(--first-color)';
        this.style.borderColor = 'var(--first-color)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.boxShadow = '';
        this.style.borderColor = 'transparent';
    });
});

//=============== INITIAL ANIMATION ON LOAD ===============
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Trigger initial animation for header
    setTimeout(() => {
        const header = document.querySelector('.cv-header');
        if (header) {
            header.classList.add('animate-in');
        }
    }, 300);
});


// =============== BACK TO PORTFOLIO BUTTON ===============
const backBtn = document.getElementById('back-btn');
if (backBtn) {
    backBtn.addEventListener('click', function(e) {
        // Optional: Add animation or confirmation
        console.log('Returning to portfolio...');
        // The link will handle navigation automatically
    });
}