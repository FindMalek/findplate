"use client"

import { motion } from "framer-motion"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

import { ShiftCard } from "@/components/fancy/shift-card"
import { Icons } from "@/components/shared/icons"
import { Button } from "@/components/ui/button"

export function MarketingAboutBlogs({ className }: { className?: string }) {
  const topContent = (
    <div className="bg-accent/90 text-primary rounded-md shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(255,252,240,0.5)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.1)_inset,0px_0px_1px_0px_rgba(28,27,26,0.5)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(255,255,255,0.03)_inset,0_0_0_1px_rgba(0,0,0,0.1),0_2px_2px_0_rgba(0,0,0,0.1),0_4px_4px_0_rgba(0,0,0,0.1),0_8px_8px_0_rgba(0,0,0,0.1)]">
      <h3 className=" p-4 text-lg">
        <Icons.logo className="mr-2 size-6" />
        {siteConfig.name}
      </h3>
    </div>
  )

  const topAnimateContent = (
    <>
      <motion.img
        transition={{ duration: 0.3, ease: "circIn" }}
        src="/blogs/story/founder.png"
        layoutId="img"
        width={78}
        height={100}
        alt="basic image"
        className="absolute  right-2 top-1.5 rounded-sm shadow-lg"
      />

      <motion.div
        className="absolute right-[6px] top-[4px] mb-[6px] ml-auto h-[70px] w-[82px] rounded-sm border-2  border-dashed border-neutral-800/80 bg-transparent  dark:mb-[3px]  dark:border-neutral-200/80"
        initial={{ opacity: 0, scale: 1.6, y: 0, filter: "blur(4px)" }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: { delay: 0.35, duration: 0.15 },
        }}
        exit={{
          opacity: 0,
          y: 100,
          filter: "blur(4px)",
          transition: { delay: 0.0, duration: 0 },
        }}
      />
    </>
  )

  const middleContent = (
    <motion.img
      src="/blogs/story/founder.png"
      layoutId="img"
      width={150}
      height={200}
      alt="basic image"
      className="rounded-sm  border-2 border-white dark:border-black"
    />
  )

  const bottomContent = (
    <div className="pb-4">
      <div className="bg-primary/90 flex w-full flex-col gap-1 rounded-t-lg border-t border-t-black/10 px-4 pb-4  ">
        <div className="flex items-center gap-1 pt-2.5 font-sans text-[14px] font-medium text-white dark:text-[#171717]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-50 -50 430 390"
            fill="#1185fd"
            aria-hidden="true"
            width="1em"
            height="1em"
          >
            <path d="M180 141.964C163.699 110.262 119.308 51.1817 78.0347 22.044C38.4971 -5.86834 23.414 -1.03207 13.526 3.43594C2.08093 8.60755 0 26.1785 0 36.5164C0 46.8542 5.66748 121.272 9.36416 133.694C21.5786 174.738 65.0603 188.607 105.104 184.156C107.151 183.852 109.227 183.572 111.329 183.312C109.267 183.642 107.19 183.924 105.104 184.156C46.4204 192.847 -5.69621 214.233 62.6582 290.33C137.848 368.18 165.705 273.637 180 225.702C194.295 273.637 210.76 364.771 295.995 290.33C360 225.702 313.58 192.85 254.896 184.158C252.81 183.926 250.733 183.645 248.671 183.315C250.773 183.574 252.849 183.855 254.896 184.158C294.94 188.61 338.421 174.74 350.636 133.697C354.333 121.275 360 46.8568 360 36.519C360 26.1811 357.919 8.61012 346.474 3.43851C336.586 -1.02949 321.503 -5.86576 281.965 22.0466C240.692 51.1843 196.301 110.262 180 141.964Z" />
          </svg>{" "}
          <p>Share your work</p>
        </div>
        <div className="w-full text-pretty pb-2 font-sans text-[13px] leading-4 text-neutral-200 dark:text-[#171717]  ">
          Share your image to build that audience. Inspired by{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={siteConfig.links.github}
          >
            @{siteConfig.name}
          </a>
        </div>

        <div className="bg-accent/80 dark:bg-accent flex flex-col gap-1 rounded-xl p-1">
          <Button>
            <svg
              viewBox="0 0 256 209"
              width="1em"
              height="1em"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid"
            >
              <path
                d="M256 25.45c-9.42 4.177-19.542 7-30.166 8.27 10.845-6.5 19.172-16.793 23.093-29.057a105.183 105.183 0 0 1-33.351 12.745C205.995 7.201 192.346.822 177.239.822c-29.006 0-52.523 23.516-52.523 52.52 0 4.117.465 8.125 1.36 11.97-43.65-2.191-82.35-23.1-108.255-54.876-4.52 7.757-7.11 16.78-7.11 26.404 0 18.222 9.273 34.297 23.365 43.716a52.312 52.312 0 0 1-23.79-6.57c-.003.22-.003.44-.003.661 0 25.447 18.104 46.675 42.13 51.5a52.592 52.592 0 0 1-23.718.9c6.683 20.866 26.08 36.05 49.062 36.475-17.975 14.086-40.622 22.483-65.228 22.483-4.24 0-8.42-.249-12.529-.734 23.243 14.902 50.85 23.597 80.51 23.597 96.607 0 149.434-80.031 149.434-149.435 0-2.278-.05-4.543-.152-6.795A106.748 106.748 0 0 0 256 25.45"
                fill="#55acee"
              />
            </svg>
            Post on Twitter
          </Button>

          <Button>
            <svg
              viewBox="0 0 256 256"
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              preserveAspectRatio="xMidYMid"
            >
              <path
                fill="#625DF5"
                d="M256 113.765h-74.858l64.83-37.43-14.237-24.667-64.83 37.43 37.421-64.825-24.667-14.246-37.421 64.826V0h-28.476v74.86L76.326 10.027 51.667 24.266 89.096 89.09 24.265 51.668l-14.238 24.66 64.83 37.43H0v28.477h74.85l-64.823 37.43 14.238 24.667 64.824-37.423-37.43 64.825 24.667 14.239 37.429-64.832V256h28.476v-74.853l37.422 64.826 24.665-14.239-37.428-64.832 64.83 37.43 14.24-24.667-64.825-37.423h74.85v-28.477H256ZM128 166.73c-21.472 0-38.876-17.403-38.876-38.876 0-21.472 17.404-38.876 38.876-38.876 21.472 0 38.875 17.404 38.875 38.876 0 21.473-17.403 38.876-38.875 38.876Z"
              />
            </svg>{" "}
            Open in Loom{" "}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <ShiftCard
        className="bg-card dark:bg-[#1A1A1A]"
        topContent={topContent}
        topAnimateContent={topAnimateContent}
        middleContent={middleContent}
        bottomContent={bottomContent}
      />
    </div>
  )
}
