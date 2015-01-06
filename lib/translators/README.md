Citoid Translators
=============

Scrape.js uses these translators to convert between different types of embedded metadata and the internal Zotero format.

For instance, Schema.org microdata has the type ['WebPage'](http://schema.org/WebPage) where the title of the particlar page is termed 'headline'. In Zotero format (the internal format used by citoid), this would correspond to the type 'webpage' and the property 'title'.

A translator is used to translate from the embedded metadata types and properties to the zotero types and properties to provide the most rich metadata possible.