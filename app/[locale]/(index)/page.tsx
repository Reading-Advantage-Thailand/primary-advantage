import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/configs/site-config";
import {
  GitBranch,
  BrainCircuit,
  BarChart4,
  BookOpen,
  Bot,
  Volume2,
  Settings,
  Users,
} from "lucide-react";
import { FeatureBox } from "@/components/index/feature-box";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "AI-Powered Content Generation",
    description:
      "Enjoy an ever-expanding library of level-appropriate articles tailored to CEFR standards",
    icon: Bot,
  },
  {
    title: "Intelligent Comprehension Exercises",
    description:
      "Enhance understanding with AI-generated multiple-choice, short-answer, and long-answer questions",
    icon: BrainCircuit,
  },
  {
    title: "Adaptive CEFR Leveling",
    description:
      "Experience precise language difficulty matching from A1 to C2 levels",
    icon: GitBranch,
  },
  {
    title: "Interactive Vocabulary Tools",
    description:
      "Build lexicon through contextual learning, flashcards, and spaced repetition exercises",
    icon: BookOpen,
  },
  {
    title: "Text-to-Speech Narration",
    description:
      "Improve listening skills with high-quality audio narration of all articles",
    icon: Volume2,
  },
  {
    title: "Progress Analytics Dashboard",
    description:
      "Track learning journey with detailed insights on reading habits, vocabulary growth, and CEFR progression",
    icon: BarChart4,
  },
  {
    title: "Customizable Reading Experience",
    description:
      "Tailor content preferences, set personal goals, and create a personalized learning path",
    icon: Settings,
  },
  {
    title: "Classroom Management Tools",
    description:
      "Empower teachers with student progress tracking, assignment capabilities, and performance reports",
    icon: Users,
  },
];

const benefits = [
  {
    title: "Accelerated Language Acquisition",
    description:
      "Boost students' language skills through extensive reading and AI-powered comprehension exercises",
  },
  {
    title: "Personalized Learning Paths",
    description:
      "Tailor content to each student's CEFR level, interests, and learning pace",
  },
  {
    title: "Engaging Multimedia Content",
    description:
      "Captivate learners with diverse articles, audio narration, and interactive exercises",
  },
  {
    title: "Real-Time Progress Tracking",
    description:
      "Monitor student growth with detailed analytics and CEFR level progression insights",
  },
  {
    title: "Efficient Vocabulary Expansion",
    description:
      "Enhance lexical knowledge through context-based learning and spaced repetition",
  },
  {
    title: "Seamless Classroom Integration",
    description:
      "Complement traditional instruction with flexible, anytime-anywhere access to learning materials",
  },
  {
    title: "Cost-Effective Solution",
    description:
      "Maximize resources with a scalable platform that grows with your student population",
  },
  {
    title: "Enhanced Teacher Productivity",
    description:
      "Streamline lesson planning and assessment with automated tools and rich content library",
  },
];

export default function Home() {
  return (
    <div>
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-3">
        <div className="container flex max-w-[64rem] py-36 flex-col items-center gap-4 text-center ">
          <h1
            id="onborda-step1"
            className="font-heading animate-glow text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-white"
          >
            {siteConfig.name}
          </h1>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl lg:text-6xl ">
            <span>Empower Your Students with</span>
            <span className="text-green-500"> AI-Enhanced </span>
            <span>Language Learning</span>
          </h2>
          <p className="max-w-[42rem] font-heading leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            Revolutionize language education with our cutting-edge platform
          </p>
          <div className="relative">
            <div className="absolute -inset-2 rounded-lg bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-gray-600 via-purple-600 to-zinc-600 opacity-50 blur-2xl"></div>
            <div className="relative flex w-60 h-14 items-center justify-center border border-zinc-700 rounded-lg text-white bg-[#172554] font-heading text-xl cursor-pointer hover:scale-105 transition-transform duration-300 ease-in-out dark:bg-white dark:text-black">
              <Link href={"/auth/signin"}>Start Your Free Trial</Link>
            </div>
          </div>
        </div>
      </section>
      <svg viewBox="0 0 800 23" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fill="#172554"
          d="M800 22.5005C533.36 22.5005 266.641 22.5005 0 22.5005C0 9.50149 0 18.6995 0 5.7005C1.979 5.9515 3.19 7.2105 5.5 6.7005C7.573 6.2425 9.898 3.3645 13.5 4.7005C14.863 5.2065 14.445 6.2425 16.5 6.7005C21.389 0.2795 34.287 1.2575 43 3.2005C48.321 4.3875 50.796 0.5055 55 1.7005C57.144 2.3095 57.77 5.0345 60 4.2005C62.848 3.4645 62.954 1.8465 67 1.7005C67.38 2.1695 71.143 5.5695 71.5 5.7005C74.084 6.6485 78.062 4.7125 80 6.2005C80.765 6.7875 81.982 9.3795 82.5 10.2005C85.838 8.2045 95.365 5.4915 101.5 7.2005C103.779 7.8355 105.027 11.2165 108.5 10.2005C109 9.7005 109.5 9.2005 110 8.7005C113.666 8.7005 117.334 8.7005 121 8.7005C123.354 8.0115 127.891 6.2885 130 5.7005C132.5 6.0335 135 6.3675 137.5 6.7005C141.539 5.3605 141.285 1.8195 148.5 1.7005C150.697 4.7095 152.573 3.1265 157 4.2005C157.238 4.2585 157.982 5.2845 158.5 5.2005C159.77 4.9945 160.533 3.0965 163 3.7005C165.456 4.3015 167.021 7.1345 169 7.7005C171.458 8.4035 174.953 6.5305 177.5 8.2005C178.783 9.0425 180.05 11.5485 181.5 12.2005C183.166 12.3675 184.834 12.5335 186.5 12.7005C187.166 13.3675 187.834 14.0335 188.5 14.7005C190.608 15.2745 190.924 13.5525 192 13.2005C194.5 13.2005 197 13.2005 199.5 13.2005C200.713 12.8285 201.824 11.2625 204 11.7005C206.477 12.1985 207.352 14.5105 209 15.2005C211.5 15.0335 214 14.8675 216.5 14.7005C217.153 14.8615 219.045 16.0965 219.5 16.2005C221.996 16.7705 225.971 14.7465 227.5 14.2005C229.833 14.2005 232.167 14.2005 234.5 14.2005C237.884 13.1995 242.581 13.1145 246 12.2005C249 12.0335 252 11.8675 255 11.7005C257.076 10.8905 260.334 8.7725 262.5 8.2005C267.087 6.9895 276.558 12.7235 280 12.2005C288.551 10.9005 295.195 6.5085 303 5.2005C307.572 4.4345 311.705 7.9095 317 6.2005C319.795 5.2985 320.689 3.7835 325 3.7005C325.082 3.8105 339.328 12.6495 339.5 12.7005C342.076 13.4675 349.15 11.5675 353 12.2005C354.744 12.4875 354.166 14.2315 356.5 13.7005C357 13.2005 357.5 12.7005 358 12.2005C362 12.2005 366 12.2005 370 12.2005C370.5 11.5335 371 10.8675 371.5 10.2005C374.143 8.5785 378.373 9.4465 381 10.2005C383.666 10.2005 386.334 10.2005 389 10.2005C391.848 11.1025 402.672 14.9125 405 11.2005C406.175 9.6735 405.919 7.7825 406.5 6.7005C407.09 6.2995 407.341 6.3135 408.5 6.2005C410.7 8.3225 416.399 4.4125 418.5 5.2005C419.971 5.7525 420.047 7.0915 423 7.2005C423 6.8675 423 6.5335 423 6.2005C422.624 5.6645 422.699 5.7275 422.5 4.7005C423.524 4.3445 424.837 4.2035 426.5 4.2005C427.073 4.9285 427.501 5.3005 428 6.2005C431.663 3.3095 444.4 -1.1775 452 1.2005C453.621 1.7075 453.684 3.8545 456.5 3.2005C456.833 2.8675 457.167 2.5335 457.5 2.2005C461.666 2.3675 465.834 2.5335 470 2.7005C471.505 2.0915 475.567 -0.7745 479 0.2005C479.5 0.7005 480 1.2005 480.5 1.7005C483 1.8675 485.5 2.0335 488 2.2005C488.5 2.7005 489 3.2005 489.5 3.7005C492.186 4.7465 494.682 3.7165 497 4.7005C498.642 5.3975 499.621 7.1795 501.5 7.7005C505.666 7.8675 509.834 8.0335 514 8.2005C514.951 8.4835 515.863 9.9355 516.5 10.2005C519.333 10.2005 522.167 10.2005 525 10.2005C526.544 8.2375 531.576 4.9715 534 4.2005C539 4.3675 544 4.5335 549 4.7005C549.333 4.2005 549.667 3.7005 550 3.2005C555.854 0.5505 564.461 6.4945 568 8.2005C570.541 9.4255 571.66 6.6545 574 7.2005C577.339 7.9785 581.41 10.8685 585.5 11.2005C589.141 6.1225 594.067 10.9535 599 11.7005C603.897 12.4425 607.296 6.9305 613 9.2005C615.632 10.2485 619.404 13.6105 624.5 12.2005C627.654 11.3275 630.772 8.0845 634 7.2005C636.915 6.4025 639.877 8.2145 642 8.7005C647.647 9.9935 650.433 6.0535 655 7.2005C657.042 7.7135 658.28 9.5185 660 10.2005C662.586 11.2255 664.607 10.9235 667 12.2005C667.667 12.8675 668.333 13.5335 669 14.2005C673 14.2005 677 14.2005 681 14.2005C681.788 14.4665 682.711 15.9355 683.5 16.2005C685.788 16.9695 699.292 16.9185 701 16.2005C702.283 15.6615 704.721 13.6815 706.5 13.2005C709.106 12.4955 710.013 14.0405 712.5 14.2005C713.485 12.6145 714.777 11.5165 716 10.2005C721.542 10.1475 726.706 10.8185 731 11.2005C732.055 9.4825 732.689 8.7945 735.5 8.7005C736.513 9.7605 736.971 10.0255 739 10.2005C739.986 8.7765 740.506 8.6935 743 8.7005C744.993 10.6675 746.643 9.2105 750 10.2005C751.853 10.7465 757.212 15.1965 760 14.2005C760.654 13.9675 762.018 12.3395 763 12.2005C765.529 11.8425 766.821 15.7675 770 14.2005C773.888 12.2845 776.714 8.5475 782 8.2005C788.722 14.1805 794.787 7.1585 800 6.2005C800 19.0325 800 9.66849 800 22.5005Z"
        />
      </svg>
      <div className="bg-[#172554]">
        <section
          id="features"
          className="container space-y-6 py-8 md:py-12 lg:py-24 my-[-2px]"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-white animate-glow text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Features
            </h2>
            <p className="max-w-[85%] leading-normal text-gray-400 sm:text-lg sm:leading-7">
              Our platform is packed with features to help you learn faster and
              more effectively than ever before with AI-enhanced learning tools.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureBox key={index} {...feature} />
            ))}
          </div>
        </section>
        <section
          id="features"
          className="container space-y-6 py-8 md:py-12 lg:py-24 bg-[#172554] my-[-2px]"
        >
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-heading text-white animate-glow text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
              Benefits for Educational Institutions
            </h2>
            <p className="max-w-[85%] leading-normal text-gray-400 sm:text-lg sm:leading-7">
              Benefites of using our platform for educational institutions to
              help students learn faster and more effectively than ever before
              with AI-enhanced learning tools.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <FeatureBox key={index} {...benefit} />
            ))}
          </div>
        </section>
      </div>
      <svg viewBox="0 0 798 23" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fill="#172554"
          d="M-1 0.5C265.64 0.5 532.359 0.5 799 0.5C799 13.499 799 4.30099 799 17.3C797.021 17.049 795.81 15.79 793.5 16.3C791.427 16.758 789.102 19.636 785.5 18.3C784.137 17.794 784.555 16.758 782.5 16.3C777.611 22.721 764.713 21.743 756 19.8C750.679 18.613 748.204 22.495 744 21.3C741.856 20.691 741.23 17.966 739 18.8C736.152 19.536 736.046 21.154 732 21.3C731.62 20.831 727.857 17.431 727.5 17.3C724.916 16.352 720.938 18.288 719 16.8C718.235 16.213 717.018 13.621 716.5 12.8C713.162 14.796 703.635 17.509 697.5 15.8C695.221 15.165 693.973 11.784 690.5 12.8C690 13.3 689.5 13.8 689 14.3C685.334 14.3 681.666 14.3 678 14.3C675.646 14.989 671.109 16.712 669 17.3C666.5 16.967 664 16.633 661.5 16.3C657.461 17.64 657.715 21.181 650.5 21.3C648.303 18.291 646.427 19.874 642 18.8C641.762 18.742 641.018 17.716 640.5 17.8C639.23 18.006 638.467 19.904 636 19.3C633.544 18.699 631.979 15.866 630 15.3C627.542 14.597 624.047 16.47 621.5 14.8C620.217 13.958 618.95 11.452 617.5 10.8C615.834 10.633 614.166 10.467 612.5 10.3C611.834 9.63299 611.166 8.96699 610.5 8.29999C608.392 7.72599 608.076 9.44799 607 9.79999C604.5 9.79999 602 9.79999 599.5 9.79999C598.287 10.172 597.176 11.738 595 11.3C592.523 10.802 591.648 8.48999 590 7.79999C587.5 7.96699 585 8.13299 582.5 8.29999C581.847 8.13899 579.955 6.90399 579.5 6.79999C577.004 6.22999 573.029 8.25399 571.5 8.79999C569.167 8.79999 566.833 8.79999 564.5 8.79999C561.116 9.80099 556.419 9.88599 553 10.8C550 10.967 547 11.133 544 11.3C541.924 12.11 538.666 14.228 536.5 14.8C531.913 16.011 522.442 10.277 519 10.8C510.449 12.1 503.805 16.492 496 17.8C491.428 18.566 487.295 15.091 482 16.8C479.205 17.702 478.311 19.217 474 19.3C473.918 19.19 459.672 10.351 459.5 10.3C456.924 9.53299 449.85 11.433 446 10.8C444.256 10.513 444.834 8.76899 442.5 9.29999C442 9.79999 441.5 10.3 441 10.8C437 10.8 433 10.8 429 10.8C428.5 11.467 428 12.133 427.5 12.8C424.857 14.422 420.627 13.554 418 12.8C415.334 12.8 412.666 12.8 410 12.8C407.152 11.898 396.328 8.08799 394 11.8C392.825 13.327 393.081 15.218 392.5 16.3C391.91 16.701 391.659 16.687 390.5 16.8C388.3 14.678 382.601 18.588 380.5 17.8C379.029 17.248 378.953 15.909 376 15.8C376 16.133 376 16.467 376 16.8C376.376 17.336 376.301 17.273 376.5 18.3C375.476 18.656 374.163 18.797 372.5 18.8C371.927 18.072 371.499 17.7 371 16.8C367.337 19.691 354.6 24.178 347 21.8C345.379 21.293 345.316 19.146 342.5 19.8C342.167 20.133 341.833 20.467 341.5 20.8C337.334 20.633 333.166 20.467 329 20.3C327.495 20.909 323.433 23.775 320 22.8C319.5 22.3 319 21.8 318.5 21.3C316 21.133 313.5 20.967 311 20.8C310.5 20.3 310 19.8 309.5 19.3C306.814 18.254 304.318 19.284 302 18.3C300.358 17.603 299.379 15.821 297.5 15.3C293.334 15.133 289.166 14.967 285 14.8C284.049 14.517 283.137 13.065 282.5 12.8C279.667 12.8 276.833 12.8 274 12.8C272.456 14.763 267.424 18.029 265 18.8C260 18.633 255 18.467 250 18.3C249.667 18.8 249.333 19.3 249 19.8C243.146 22.45 234.539 16.506 231 14.8C228.459 13.575 227.34 16.346 225 15.8C221.661 15.022 217.59 12.132 213.5 11.8C209.859 16.878 204.933 12.047 200 11.3C195.103 10.558 191.704 16.07 186 13.8C183.368 12.752 179.596 9.38999 174.5 10.8C171.346 11.673 168.228 14.916 165 15.8C162.085 16.598 159.123 14.786 157 14.3C151.353 13.007 148.567 16.947 144 15.8C141.958 15.287 140.72 13.482 139 12.8C136.414 11.775 134.393 12.077 132 10.8C131.333 10.133 130.667 9.46699 130 8.79999C126 8.79999 122 8.79999 118 8.79999C117.212 8.53399 116.289 7.06499 115.5 6.79999C113.212 6.03099 99.708 6.08199 98 6.79999C96.717 7.33899 94.279 9.31899 92.5 9.79999C89.894 10.505 88.987 8.95999 86.5 8.79999C85.515 10.386 84.223 11.484 83 12.8C77.458 12.853 72.294 12.182 68 11.8C66.945 13.518 66.311 14.206 63.5 14.3C62.487 13.24 62.029 12.975 60 12.8C59.014 14.224 58.494 14.307 56 14.3C54.007 12.333 52.357 13.79 49 12.8C47.147 12.254 41.788 7.80399 39 8.79999C38.346 9.03299 36.982 10.661 36 10.8C33.471 11.158 32.179 7.23299 29 8.79999C25.112 10.716 22.286 14.453 17 14.8C10.278 8.81999 4.213 15.842 -1 16.8C-1 3.96799 -1 13.332 -1 0.5Z"
        />
      </svg>
      <section id="contact-us" className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
          <h2 className="font-heading text-white animate-glow text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Let&apos;s Get in Touch
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Have a question or need more information? Contact us today to learn
            more about our platform.
          </p>
          <Card className="mt-10 text-start w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl dark:text-white text-black">
                Contact Us
              </CardTitle>
              <CardDescription>
                Get in touch with us to learn more about our platform
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="John Doe" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" placeholder="University of Example" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inquiry">Inquiry</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="partnerships">Partnerships</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  placeholder="Type your message here."
                  id="message"
                  className="h-40"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Send Message</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      <section
        id="start-free-trial"
        className="container py-8 md:py-12 lg:py-24 mb-20"
      >
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
          <h2 className="font-heading text-white animate-glow text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Ready to Transform Language Learning?
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Start a free trial to see how our AI-enhanced learning tools can
            help you achieve your language learning goals.
            <Link
              href="/auth/signin"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Start Your Free Trial
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
