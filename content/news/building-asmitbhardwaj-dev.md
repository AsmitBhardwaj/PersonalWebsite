---
title: Building a portfolio inside a 2004 Sidekick
date: 2026-10-02
summary: Why my portfolio is a T-Mobile Sidekick II, the forgotten phone that invented the future, and what it took to bring it back to life in a browser.
---

asmitbhardwaj.dev is a working recreation of the T-Mobile Sidekick II. Instead of a scrolling résumé, you find a phone. It buzzes. There's a message waiting for you. You swivel it open, and every icon on the home screen opens a real app: Projects, Experience, Photos, and two games.

This is the story of why I chose that phone, and what it took to make it feel alive again.

## The phone that saw the future first

In 2002, phones were for calls. Maybe a text, typed letter by letter on a number pad. The internet lived on a desk, behind a dial-up tone.

Then a small company in Palo Alto called Danger shipped something that didn't make sense yet. They called it the Hiptop. T-Mobile called it the Sidekick.

You held it sideways, with both hands. You pushed the screen, and it spun a full 180 degrees on a hinge to reveal a complete keyboard underneath. It had a real web browser, not the stripped-down mobile web of the time. It had email. And it had AOL Instant Messenger built right in, which meant that for the first time, the conversation didn't stop when you left your computer.

It was quietly years ahead in ways nobody had words for yet. Your contacts, messages and photos didn't live on the phone. They lived on Danger's servers, so if you lost it, you got a new one, signed in, and everything came back. That was the cloud before anyone called it the cloud. It had a catalog of apps you could download, six years before the App Store.

## The people who carried it

The Sidekick was never the business phone. It was the phone of teenagers and college kids, of people who lived on AIM, of anyone who wanted to be talking to someone, somewhere, all the time. It showed up in music videos and in the hands of celebrities, and it became a status symbol in a way no phone had been before.

It's hard to explain now, but the Sidekick made the phone personal. It was the first device that felt like it was built for people, not for work.

## And then, the world forgot

In 2007, the iPhone arrived. In 2008, Microsoft bought Danger. The Sidekicks that followed never caught the moment again, and on May 31, 2011, Danger's servers went dark. The cloud that had held everyone's messages and photos was switched off, and the phone that had invented so much simply stopped working.

But here's the part that stays with me. Danger was cofounded by Andy Rubin. A few years after the Hiptop, he started another company, built another operating system, and called it Android. Today, it runs on billions of phones.

The Sidekick didn't lose. It became the blueprint. Every phone in your pocket carries a little of it: the keyboard-first messaging, the cloud sync, the app store, the idea that a phone should be built for people. Almost nobody remembers where it came from.

## Why it's my portfolio

I build products, and the Sidekick is a reminder of what that really means. The people who get there first are not always the ones who get remembered. You build anyway. You build the thing that's right before the world is ready for it, and you build it so well that the ideas outlive the product.

It's also a good constraint. A small, fixed set of apps forces every part of a portfolio into a shape that has to justify itself. Nothing gets to be filler.

## Making the swivel feel physical

The screen doesn't fade or slide. It spins 180° around a pivot, the way the real hinge did. Getting it to feel right took more than an animation curve: a spring-loaded speed profile that starts slow and whips through the middle, a few degrees of overshoot, a small recoil of the body when it snaps into place, a shadow that grows as the screen lifts, and a glass reflection that stays still while the screen turns beneath it. You can grab the screen and swivel it yourself.

## Period details

The closed phone shows a pixel lock screen, and opening it plays a boot sequence in the style of Danger OS. When you type on your real keyboard, the matching key on the Sidekick lights up with the same blue backlight the real device had. Type and Snake are built around that keyboard and the d-pad.

## One phone, every screen size

A phone screen is small, so reading apps zoom the camera in on desktop and take over the screen on phones. Games stay inside the device so the keyboard stays visible. Photos are resized automatically and stripped of location data before they're published.

## The part crawlers see

Search engines and AI assistants don't tap icons. So every app reads from the same content files that also render as plain HTML, which is why you can read this post without ever opening the phone.

## Built with

Vite, React and TypeScript, animated with GSAP, tested across Chrome, Firefox, Safari and mobile Safari with Playwright, and deployed on Vercel.
