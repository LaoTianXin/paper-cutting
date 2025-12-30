// Centralized image imports for Paper-Cutting UI
// This file imports all images used across the 5 pages to avoid repetitive imports

// Page 1 - Scan Start
import page1Background from "../assets/images/page1/background.png";
import page1Frame from "../assets/images/page1/frame.png";
import page1BottomFrame from "../assets/images/page1/bottom-frame.png";
import page1PaperCuttingFrame from "../assets/images/page1/paper-cutting-frame.png";
import page1Logo from "../assets/images/page1/logo.png";
import page1Footprints from "../assets/images/page1/footprints.png";

// Page 2 - Gesture Comparison
import page2Background from "../assets/images/page2/background.png";
import page2Frame from "../assets/images/page2/frame.png";
import page2GestureIcon from "../assets/images/page2/gesture-icon.png";
import page2BottomFrame from "../assets/images/page2/bottom-frame.png";
import page2PaperCuttingFrame from "../assets/images/page2/paper-cutting-frame.png";
import page2Logo from "../assets/images/page2/logo.png";

// Page 3 - Countdown
import page3Background from "../assets/images/page3/background.png";
import page3Frame from "../assets/images/page3/frame.png";
import page3CountdownIcon from "../assets/images/page3/countdown-icon.png";
import page3BottomFrame from "../assets/images/page3/bottom-frame.png";
import page3PaperCuttingFrame from "../assets/images/page3/paper-cutting-frame.png";
import page3Logo from "../assets/images/page3/logo.png";

// Page 4 - Photo Capture
import page4Frame from "../assets/images/page4/frame.png";
import page4ShutterEffect1 from "../assets/images/page4/shutter-effect-1.png";
import page4ShutterEffect2 from "../assets/images/page4/shutter-effect-2.png";
import page4ShutterEffect3 from "../assets/images/page4/shutter-effect-3.png";
import page4ShutterEffect4 from "../assets/images/page4/shutter-effect-4.png";
import page4Logo from "../assets/images/page4/logo.png";
import page4Background from "../assets/images/page4/background.png";
import page4PaperCuttingFrame from "../assets/images/page4/paper-cutting-frame.png";


// Page 5 - Image Display
import page5Frame from "../assets/images/page5/frame.png";
import page5MaskGroup from "../assets/images/page5/mask-group.png";
import page5PhotoFrame from "../assets/images/page5/photo-frame.png";
import page5BottomFrame from "../assets/images/page5/bottom-frame.png";
import page5Decoration1 from "../assets/images/page5/decoration-1.png";
import page5Decoration2 from "../assets/images/page5/decoration-2.png";
import page5Decoration3 from "../assets/images/page5/decoration-3.png";
import page5Decoration4 from "../assets/images/page5/decoration-4.png";
import page5Decoration5 from "../assets/images/page5/decoration-5.png";
import page5Ornament from "../assets/images/page5/ornament.png";
import page5Border from "../assets/images/page5/border.png";

// Export organized by page
export const Page1Images = {
  background: page1Background,
  frame: page1Frame,
  bottomFrame: page1BottomFrame,
  paperCuttingFrame: page1PaperCuttingFrame,
  logo: page1Logo,
  footprints: page1Footprints,
};

export const Page2Images = {
  background: page2Background,
  frame: page2Frame,
  gestureIcon: page2GestureIcon,
  bottomFrame: page2BottomFrame,
  paperCuttingFrame: page2PaperCuttingFrame,
  logo: page2Logo,
};

export const Page3Images = {
  background: page3Background,
  frame: page3Frame,
  countdownIcon: page3CountdownIcon,
  bottomFrame: page3BottomFrame,
  paperCuttingFrame: page3PaperCuttingFrame,
  logo: page3Logo,
};

export const Page4Images = {
  background: page4Background,
  frame: page4Frame,
  shutterEffects: [
    page4ShutterEffect1,
    page4ShutterEffect2,
    page4ShutterEffect3,
    page4ShutterEffect4,
  ],
  logo: page4Logo,
  paperCuttingFrame: page4PaperCuttingFrame,
};

export const Page5Images = {
  frame: page5Frame,
  maskGroup: page5MaskGroup,
  photoFrame: page5PhotoFrame,
  bottomFrame: page5BottomFrame,
  decorations: [
    page5Decoration1,
    page5Decoration2,
    page5Decoration3,
    page5Decoration4,
    page5Decoration5,
  ],
  ornament: page5Ornament,
  border: page5Border,
};
